import {
  Color,
  Icon,
  LaunchType,
  MenuBarExtra,
  copyTextToClipboard,
  launchCommand,
  showToast,
  Toast,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useEffect, useMemo } from "react";

import { CliTailscaleClient } from "./clients/cli-tailscale-client";
import { getExtensionPreferences, resolveRefreshInterval, resolveTailscalePath } from "./preferences";
import { DashboardState } from "./types";

function getMenuBarIcon(state?: DashboardState): { source: Icon; tintColor?: Color } {
  switch (state?.connectionState) {
    case "connected":
      return { source: Icon.CheckCircle, tintColor: Color.Green };
    case "needs-login":
      return { source: Icon.ExclamationMark, tintColor: Color.Orange };
    case "stopped":
      return { source: Icon.XMarkCircle, tintColor: Color.Red };
    default:
      return { source: Icon.Network, tintColor: Color.SecondaryText };
  }
}

async function launchDashboard() {
  await launchCommand({ name: "tailscale", type: LaunchType.UserInitiated });
}

export default function Command() {
  const preferences = getExtensionPreferences();
  const refreshIntervalSeconds = resolveRefreshInterval(preferences);
  const tailscalePath = resolveTailscalePath(preferences);
  const client = useMemo(() => new CliTailscaleClient(tailscalePath), [tailscalePath]);

  const {
    data,
    isLoading,
    revalidate: refresh,
  } = useCachedPromise(
    async (binaryPath: string) => {
      return new CliTailscaleClient(binaryPath).getDashboardState();
    },
    [tailscalePath],
    {
      keepPreviousData: true,
    },
  );

  useEffect(() => {
    const interval = setInterval(() => {
      void refresh();
    }, refreshIntervalSeconds * 1000);

    return () => clearInterval(interval);
  }, [refresh, refreshIntervalSeconds]);

  const onlinePeers = data?.peers.filter((peer) => peer.online) ?? [];
  const icon = getMenuBarIcon(data);
  const title = data?.connectionState === "connected" ? `${onlinePeers.length}` : undefined;
  const tooltip = data?.self
    ? `${data.self.hostName} • ${data.connectionState}${data.self.currentExitNodeName ? ` • Exit: ${data.self.currentExitNodeName}` : ""}`
    : "Tailscale";

  return (
    <MenuBarExtra icon={icon} title={title} tooltip={tooltip} isLoading={isLoading}>
      <MenuBarExtra.Section title="Status">
        <MenuBarExtra.Item title={data?.self?.hostName ?? "Tailscale"} subtitle={data?.backendState ?? "Unavailable"} />
        {data?.self?.currentExitNodeName ? (
          <MenuBarExtra.Item title="Exit Node" subtitle={data.self.currentExitNodeName} />
        ) : null}
        <MenuBarExtra.Item title="Online Peers" subtitle={String(onlinePeers.length)} />
      </MenuBarExtra.Section>

      <MenuBarExtra.Section title="Actions">
        <MenuBarExtra.Item title="Open Dashboard" icon={Icon.AppWindow} onAction={launchDashboard} />
        <MenuBarExtra.Item title="Refresh" icon={Icon.ArrowClockwise} onAction={refresh} />
        {data?.connectionState === "connected" ? (
          <MenuBarExtra.Item
            title="Disconnect"
            icon={Icon.Power}
            onAction={async () => {
              const toast = await showToast({ style: Toast.Style.Animated, title: "Disconnecting Tailscale" });
              try {
                await client.disconnect();
                toast.style = Toast.Style.Success;
                toast.title = "Disconnected from Tailscale";
                await refresh();
              } catch (error) {
                toast.style = Toast.Style.Failure;
                toast.title = "Could Not Disconnect";
                toast.message = error instanceof Error ? error.message : "Unknown error";
              }
            }}
          />
        ) : (
          <MenuBarExtra.Item
            title="Connect"
            icon={Icon.Power}
            onAction={async () => {
              const toast = await showToast({ style: Toast.Style.Animated, title: "Connecting Tailscale" });
              try {
                await client.connect();
                toast.style = Toast.Style.Success;
                toast.title = "Connected to Tailscale";
                await refresh();
              } catch (error) {
                toast.style = Toast.Style.Failure;
                toast.title = "Could Not Connect";
                toast.message = error instanceof Error ? error.message : "Unknown error";
              }
            }}
          />
        )}
      </MenuBarExtra.Section>

      {data?.self?.ips[0] ? (
        <MenuBarExtra.Section title="Copy">
          <MenuBarExtra.Item
            title="Copy Tailscale IP"
            subtitle={data.self.ips[0]}
            icon={Icon.Clipboard}
            onAction={() => copyTextToClipboard(data.self?.ips[0] ?? "")}
          />
          {data.self.dnsName ? (
            <MenuBarExtra.Item
              title="Copy MagicDNS Name"
              subtitle={data.self.dnsName}
              icon={Icon.Clipboard}
              onAction={() => copyTextToClipboard(data.self?.dnsName ?? "")}
            />
          ) : null}
        </MenuBarExtra.Section>
      ) : null}

      {onlinePeers.length > 0 ? (
        <MenuBarExtra.Section title="Online Peers">
          {onlinePeers.slice(0, 8).map((peer) => (
            <MenuBarExtra.Item
              key={peer.id}
              title={peer.hostName}
              subtitle={peer.ips[0]}
              icon={Icon.CircleFilled}
              onAction={() => copyTextToClipboard(peer.dnsName || peer.ips[0] || peer.hostName)}
            />
          ))}
        </MenuBarExtra.Section>
      ) : null}
    </MenuBarExtra>
  );
}
