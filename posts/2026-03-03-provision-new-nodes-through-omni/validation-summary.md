# Validation Summary: How to Provision New Nodes Through Omni

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Sidero Omni (SaaS / self-hosted Talos management plane)
- Talos Linux
- SideroLink (WireGuard tunnel used by Omni-managed Talos nodes)
- Talos Image Factory
- omnictl (Omni CLI, COSI-style)
- talosctl
- Kubernetes (kubectl, CNI)
- Flannel / Cilium (CNI options)

## Sources Consulted
- Sidero Omni documentation: https://omni.siderolabs.com/ and https://docs.siderolabs.com/omni/
- omnictl CLI reference: https://docs.siderolabs.com/omni/reference/cli
- siderolabs/omni source, cluster command tree: https://github.com/siderolabs/omni/tree/main/client/pkg/omnictl/cluster
- "Create a Machine Class" guide: https://docs.siderolabs.com/omni/omni-cluster-setup/create-a-machine-class
- "Register machines with Omni": https://github.com/siderolabs/omni-docs/blob/main/how-to-guides/registering-machines/README.md
- Talos Image Factory: https://github.com/siderolabs/image-factory and https://factory.talos.dev
- Talos Flannel CNI docs: https://docs.siderolabs.com/kubernetes-guides/cni/flannel
- Talos / SideroLink documentation: https://www.talos.dev/

## Issues Found

Several significant technical inaccuracies were found and corrected:

1. **Fabricated image download URLs.** The original post had `curl -LO https://omni.siderolabs.com/image/talos/v1.6.0/metal-amd64.iso` (and `aws-amd64.raw.xz`, `vmware-amd64.ova` variants). That URL pattern does not exist. Omni images are downloaded from a per-account dashboard URL (e.g. `https://<your-account>.omni.siderolabs.io/...`) and are produced by the Talos Image Factory with an account-specific schematic ID. **Fix:** rewrote the section to describe the dashboard "Download Installation Media" flow and the Image Factory schematic concept, and replaced the fake curl commands with a comment-only example URL of the real form.

2. **"Omni agent" misnomer.** The post repeatedly referred to an "Omni agent" running alongside Talos services. There is no separate Omni agent; Talos itself includes the `siderolink` subsystem (a WireGuard-based tunnel) that handles registration with Omni. **Fix:** removed references to a separate agent and replaced them with accurate SideroLink descriptions, including the boot-time tunnel handshake.

3. **Non-existent omnictl subcommands.** The post used `omnictl cluster create`, `omnictl cluster scale`, and `omnictl cluster remove-machine`. None of these subcommands exist (verified against `client/pkg/omnictl/cluster/` in the siderolabs/omni repo — the real subcommands are `delete`, `import`, `kubernetes`, `lock`, `machine`, `secret`, `status`, `template`, `unlock`). Cluster lifecycle in Omni is driven by templates applied with `omnictl cluster template sync`. **Fix:** rewrote all command examples to use the real template-based workflow (`cluster template validate`, `cluster template sync`, `cluster machine destroy`) and added an example cluster template YAML.

4. **Non-existent omnictl flags.** `omnictl get machines --available` and `omnictl get machines --cluster my-cluster` were used; neither flag exists. `get` supports `-l/--selector` only. **Fix:** replaced with label-selector forms like `-l '!omni.sidero.dev/cluster'` and `-l omni.sidero.dev/cluster=my-cluster` against the `machinestatuses` resource.

5. **Incorrect MachineClass YAML format.** The post used a Kubernetes-style `apiVersion: omni.sidero.dev/v1alpha1` / `kind: MachineClass` / `spec.matchLabels` (map) structure. Omni resources are COSI resources, not Kubernetes CRDs — they use `metadata.namespace`, `metadata.type: MachineClasses.omni.sidero.dev`, `metadata.id`, and `spec.matchlabels` (lowercase) as a list of selector-expression strings. **Fix:** rewrote the YAML to the correct COSI format and added the `omnictl apply` invocation.

6. **Wrong talosctl service name.** The post showed `talosctl -n <ip> logs omni-agent`. There is no `omni-agent` service in Talos. The documented way to debug Omni connectivity is to tail `controller-runtime` logs and filter for `siderolink`. **Fix:** replaced with `talosctl logs controller-runtime | grep -i siderolink`.

7. **Incorrect CNI default claim.** The post asserted "Talos does not include a CNI by default". This is wrong — Talos installs Flannel as the default CNI unless you explicitly opt out via `cluster.network.cni.name: none`. **Fix:** corrected the statement and noted the opt-out path for users who want Cilium/Calico instead.

## Review Notes

- The post pins Talos to `v1.6.0` and Kubernetes to `v1.29.0` in example templates. Both are now older releases (Talos 1.9.x and Kubernetes 1.32 are current as of early 2026), but the post does not present these as recommendations — they are illustrative version pins in templates. Left as-is to preserve the author's intent and avoid scope creep.
- The `machineClass: name: large-workers` reference syntax in the cluster template `Workers` block was kept brief; the real template schema is richer (you can also specify allocation strategy, etc.), but the inline mention is accurate enough for the level of detail in this post.
- The dashboard UI flow ("Add Machine", control plane vs worker selection) is described at a high level and matches the documented UX, though Omni's UI evolves; minor label changes over time are possible.
- The claim that Omni "will not let you remove a control plane node if doing so would break quorum" reflects Omni's documented etcd-quorum awareness; left intact.
