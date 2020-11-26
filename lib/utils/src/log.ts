/**
 * Copyright 2020 Opstrace, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { format, createLogger, transports, config, Logger } from "winston";

const logFormat = format.printf(
  ({ level, message, timestamp, stack }) =>
    `${timestamp} ${level}: ${message}${stack ? ": " + stack : ""}`
);

// Note that other modules importing `log` from here will see see 'live
// updates' to this variable: "The static import statement is used to import
// read only live bindings". Consuming modules are supposed to import `log` and
// then use it via `log.info('msg')` etc.
export let log: Logger;

export function setLogger(logger: Logger) {
  if (log !== undefined) {
    throw Error("logger already set");
  }
  log = logger;
}

export interface CliLogOptions {
  filePath?: string;
  fileLevel?: string;
  stderrLevel: string;
}

export function buildLogger(opts: CliLogOptions): Logger {
  // Try to import the `TransportStream` type. Use that instead of `any`.
  const ts: any[] = [
    // Emit to stderr (stdout is default). Also see opstrace-prelaunch/issues/998.
    new transports.Console({
      stderrLevels: Object.keys(config.syslog.levels),
      level: opts.stderrLevel,
      format: format.combine(
        // removing format.error because it throws "function does not exist" and
        // adding the stack formatting to the logFormat above instead.
        format.splat(),
        format.timestamp(),
        format.colorize(),
        logFormat
      )
    })
  ];

  if (
    [opts.filePath, opts.fileLevel].filter(v => v !== undefined).length == 1
  ) {
    throw Error("logfileLevel requires logfilePath and vice versa");
  }

  if (opts.fileLevel !== undefined) {
    ts.push(
      new transports.File({
        filename: opts.filePath,
        level: opts.fileLevel,
        format: format.combine(
          // removing format.error because it throws "function does not exist" and
          // adding the stack formatting to the logFormat above instead.
          format.splat(),
          format.timestamp(),
          logFormat
        )
      })
    );
  }

  // console.log(JSON.stringify(ts, null, 2));

  return createLogger({
    // Use syslog levels (`warning' etc.),
    // see https://github.com/winstonjs/winston-syslog#log-levels
    levels: config.syslog.levels,
    transports: ts
  });
}

// file transport options
//
// filename?: string;
// dirname?: string;
// options?: object;
// maxsize?: number;
// stream?: NodeJS.WritableStream;
// rotationFormat?: Function;
// zippedArchive?: boolean;
// maxFiles?: number;
// eol?: string;
// tailable?: boolean;
