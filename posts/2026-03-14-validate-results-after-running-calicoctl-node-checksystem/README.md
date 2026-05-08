# Validating Results After Running calicoctl node checksystem

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Calicoctl, Validation, System Requirements, Kubernetes

Description: Interpret and validate calicoctl node checksystem output to confirm your hosts are fully prepared for Calico deployment, with guidance on which warnings matter.

---

## Introduction

The output of `calicoctl node checksystem` contains OK/FAIL results, warnings, and a non-zero exit status if required checks fail. Understanding which findings are critical, which are situational, and which can be safely ignored depends on your specific Calico configuration. Not every warning requires action.

This guide helps you interpret checksystem results in the context of your deployment, distinguishing between must-fix failed checks and configuration-dependent warnings.

## Prerequisites

- Output from `calicoctl node checksystem`
- Knowledge of your target Calico configuration (encapsulation mode, policy features)
- Root access for testing fixes

## Understanding Output Categories

### Failed Checks (Must Fix)

Failed checks indicate requirements that are always necessary:

```yaml
ip_tables                                           FAIL
WARNING: Unable to detect the ip_tables module as Loaded/Builtin module or lsmod
```

These must be resolved before deploying Calico.

### Warnings (Situation-Dependent)

Warnings indicate features that may or may not be needed:

```yaml
WARNING: Unable to detect the ipt_ipvs module as Loaded/Builtin module or lsmod
WARNING: Unable to detect the vxlan module as Loaded/Builtin module or lsmod
```

Whether to fix these depends on your configuration:

```bash
# If using IPVS kube-proxy mode, IPVS support is required

# If using iptables kube-proxy mode, ipt_ipvs can be ignored

# If using VXLAN encapsulation, vxlan module is required
# If using IPIP or no encapsulation, vxlan can be ignored
```

## Validation Decision Matrix

```bash
#!/bin/bash
# validate-checksystem.sh
# Validates checksystem results against your deployment configuration

# Configuration: Set these based on your deployment
ENCAPSULATION="vxlan"      # Options: vxlan, ipip, none
KUBE_PROXY_MODE="iptables" # Options: iptables, ipvs
IPV6_ENABLED="false"       # Options: true, false

echo "=== Checksystem Validation ==="
echo "Encapsulation: $ENCAPSULATION"
echo "Kube-proxy mode: $KUBE_PROXY_MODE"
echo "IPv6 enabled: $IPV6_ENABLED"
echo ""

RESULT=$(sudo calicoctl node checksystem 2>&1)
echo "$RESULT"
echo ""

echo "=== Contextual Assessment ==="

# Check encapsulation-specific modules
if [ "$ENCAPSULATION" = "vxlan" ]; then
  if echo "$RESULT" | grep -Eq "Unable to detect.*vxlan|vxlan[[:space:]]+FAIL"; then
    echo "CRITICAL: VXLAN module required for your configuration"
  fi
elif [ "$ENCAPSULATION" = "ipip" ]; then
  if echo "$RESULT" | grep -Eq "Unable to detect.*ipip|ipip[[:space:]]+FAIL"; then
    echo "CRITICAL: IPIP module required for your configuration"
  fi
fi

# Check kube-proxy mode dependencies
if [ "$KUBE_PROXY_MODE" = "ipvs" ]; then
  if echo "$RESULT" | grep -Eq "Unable to detect.*ipt_ipvs|ipt_ipvs[[:space:]]+FAIL"; then
    echo "CRITICAL: ipt_ipvs support required for IPVS mode"
  fi
else
  if echo "$RESULT" | grep -Eq "Unable to detect.*ipt_ipvs|ipt_ipvs[[:space:]]+FAIL"; then
    echo "INFO: ipt_ipvs warning can be ignored (using iptables mode)"
  fi
fi

# Check IPv6 requirements
if [ "$IPV6_ENABLED" = "false" ]; then
  if echo "$RESULT" | grep -Eq "Unable to detect.*ip6_tables|ip6_tables[[:space:]]+FAIL"; then
    echo "INFO: ip6_tables warning can be ignored (IPv6 disabled)"
  fi
fi
```

## Cross-Validating with Running Configuration

Confirm that the system state matches what Calico actually needs:

```bash
# Check which encapsulation is configured
calicoctl get ippools -o yaml | grep -E "ipipMode|vxlanMode"

# Check whether the default BGP node-to-node mesh is enabled
calicoctl get bgpconfigurations default -o yaml | grep nodeToNodeMeshEnabled

# Verify the findings against actual configuration
echo "Your IP pool configuration:"
calicoctl get ippools -o yaml
```

## Verification

Run the contextual validation:

```bash
sudo ./validate-checksystem.sh
```

All critical items for your configuration should pass.

## Troubleshooting

- **Checksystem shows no errors but Calico still fails**: There may be network-level issues (firewall, MTU) that checksystem does not test. These require separate verification.
- **Module loads but checksystem reruns still show warning**: `checksystem` also checks module metadata and kernel configuration files. Verify the module appears in `/lib/modules/$(uname -r)/modules.dep`, `/lib/modules/$(uname -r)/modules.builtin`, or the kernel config path used by `checksystem`.
- **Different results on seemingly identical nodes**: Check kernel versions and installed packages. Even minor kernel differences can affect module availability.

## Conclusion

Validating `calicoctl node checksystem` results requires understanding your specific Calico configuration. By contextualizing warnings against your deployment choices, you can focus remediation efforts on issues that actually matter for your environment while safely deferring warnings that do not apply to your setup.
