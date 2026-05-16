# Validation Summary: How to Install Talos Linux on Vultr

## Status
validated

## Post Type
Tutorial / Step-by-step guide

## Technologies Covered
- Talos Linux (v1.7.0)
- Vultr cloud (VPC 2.0, Load Balancer, Instances, ISO, Block Storage)
- vultr-cli
- talosctl
- kubectl
- Kubernetes
- Cilium CNI
- Vultr CSI driver

## Sources Consulted
- vultr-cli source (load-balancer, iso, instance, vpc2 commands and printers): https://github.com/vultr/vultr-cli
- govultr SDK type definitions (JSON tags for ISO, Instance, LoadBalancer, VPC2): https://github.com/vultr/govultr
- Vultr CSI driver installation docs: https://github.com/vultr/vultr-csi/blob/master/docs/kubernetes/README.md
- Talos talosctl installation docs: https://docs.siderolabs.com/talos/v1.12/getting-started/talosctl
- Talos GitHub releases (v1.7.0 ISO asset): https://github.com/siderolabs/talos/releases
- vultr-cli latest GitHub release assets (filename convention): https://api.github.com/repos/vultr/vultr-cli/releases/latest

## Issues Found

1. **Vultr CLI Linux install URL was wrong.** The post used `vultr-cli_linux_amd64.tar.gz` against `releases/latest/download/`. The actual release assets are named with the version (e.g. `vultr-cli_v3.10.0_linux_amd64.tar.gz`), so the static path returns 404. Replaced with a snippet that resolves the latest tag from the GitHub API and constructs the correct URL. Also corrected the macOS Homebrew formula to `vultr/vultr-cli/vultr-cli` since the formula lives in Vultr's tap.

2. **ISO create output parsing was broken.** `vultr-cli iso create` (and `iso list`) render as a horizontal table with a header row (`ISOPrinter` defines `Columns()` returning ID/FILE NAME/SIZE/STATUS/...). The original `grep "^ID" | awk '{print $2}'` matched the header line and returned the literal word `FILE`, not the ISO UUID. Switched to `-o json | jq -r '.iso.id'`.

3. **ISO list status check was reading the wrong column.** `vultr-cli iso list` columns are `ID, FILE NAME, SIZE, STATUS, MD5SUM, SHA512SUM, DATE CREATED`. The original `awk '{print $3}'` returned the SIZE value, never `complete`, so the wait loop would never exit. Switched to `vultr-cli iso get ${ISO_ID} -o json | jq -r '.iso.status'`.

4. **VPC2 create output parsing was broken.** `VPC2Printer` is also a horizontal table (header + row), so `grep "^ID" | awk '{print $2}'` returned `DATE` from the header. Switched to `-o json | jq -r '.vpc.id'` (govultr/vultr-cli wraps under the `vpc` key, not `vpc2`).

5. **`vultr-cli load-balancer rule-update` does not exist.** The actual load-balancer subcommands are `create`, `delete`, `get`, `list`, `update`, plus `forwarding`/`firewall`/`ssl` groups (no `rule-update`). Instances are attached via `load-balancer update --instances`. Replaced `rule-update` with `update`.

6. **`vultr-cli load-balancer create --health-check` does not exist.** Health checks are configured via individual flags (`--protocol`, `--port`, `--path`, `--check-interval`, `--response-timeout`, `--healthy-threshold`, `--unhealthy-threshold`). Replaced the bogus `--health-check "..."` string with the individual flags carrying the same values.

7. **Load balancer create/get output parsing was fragile but salvageable.** `LBPrinter` actually renders vertically (key/value), so the grep + awk worked, but the parsing breaks the moment the format changes. Switched both `LB_ID` and `LB_IP` extraction to `-o json | jq -r '.load_balancer.id'` / `.load_balancer.ipv4` for consistency.

8. **Instance `MAIN IP` parsing used the wrong awk column in three places.** `vultr-cli instance get` is a vertical key/value table where the `MAIN IP` row tokenizes as `MAIN | IP | <address>`. Line 75 correctly used `$3`, but the control-plane (lines 178-180) and worker (line 225) versions used `$2`, which would assign the literal string `IP` to the IP variables. Switched all three to JSON parsing (`-o json | jq -r '.instance.main_ip'`).

9. **Instance create output parsing — partial issue.** `InstancePrinter` is vertical, so `grep "^ID" | awk '{print $2}'` happened to return the correct ID. Still switched to JSON for consistency and resilience.

10. **Vultr CSI driver manifest URL had wrong extension.** The Vultr CSI repo serves `latest.yml`, not `latest.yaml`. Fixed.

## Review Notes
- The post pins Talos to `v1.7.0` (released April 2024). As of 2026 this is several releases behind (current stable is in the v1.12 line). The pin is internally consistent — same version used for ISO download and installer image — but readers should bump both references in lock-step if they want a newer release.
- `vultr-cli` JSON output is the right contract to script against; the original grep/awk approach is brittle even where it happens to work, because column ordering and header presence can change between versions. Future posts in this series should default to `-o json | jq` for Vultr scripting.
- The post asserts the cluster will come up with the LB attached to control-plane nodes, but it does not create a forwarding rule that targets a non-default backend port; the single rule with `frontend_port:6443/backend_port:6443` is correct for Talos Kubernetes API exposure, so this is fine.
- `--vpc-ids` on `vultr-cli instance create` accepts only the VPC ID — VPC interfaces appear inside the guest as additional NICs. The Talos patch declares `eth1: dhcp: true`, which matches Vultr's VPC 2.0 behavior (VPC attaches as a separate DHCP-served interface). No change needed.
- The `cleanup` section uses `vultr-cli vpc2 delete`/`load-balancer delete`/`instance delete`/`iso delete`, all of which are valid subcommands.
