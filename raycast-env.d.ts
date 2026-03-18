/// <reference types="@raycast/api">

/* 🚧 🚧 🚧
 * This file is auto-generated from the extension's manifest.
 * Do not modify manually. Instead, update the `package.json` file.
 * 🚧 🚧 🚧 */

/* eslint-disable @typescript-eslint/ban-types */

type ExtensionPreferences = {
  /** Tailscale Path - Optional absolute path to the tailscale CLI binary. Leave blank to use PATH lookup. */
  "tailscalePath": string,
  /** Refresh Interval - How often the dashboard refreshes automatically. */
  "refreshIntervalSeconds": "15" | "30" | "60" | "120",
  /** Peers - Include offline devices in the peer list. */
  "showOfflinePeers": boolean
}

/** Preferences accessible in all the extension's commands */
declare type Preferences = ExtensionPreferences

declare namespace Preferences {
  /** Preferences accessible in the `tailscale` command */
  export type Tailscale = ExtensionPreferences & {}
}

declare namespace Arguments {
  /** Arguments passed to the `tailscale` command */
  export type Tailscale = {}
}

