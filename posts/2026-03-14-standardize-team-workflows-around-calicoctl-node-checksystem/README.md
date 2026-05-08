# Standardizing Team Workflows Around calicoctl node checksystem

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Calicoctl, System Requirements, Team Workflows, Best Practice

Description: Create standardized pre-deployment validation procedures using calicoctl node checksystem to ensure every node joining your cluster meets Calico requirements.

---

## Introduction

When different team members provision nodes with different configurations, some nodes meet Calico requirements while others do not. This inconsistency leads to mysterious networking failures on specific nodes that work fine on others. Standardizing how your team validates system requirements eliminates this class of problems.

This guide establishes team-wide procedures for system requirement validation, from golden image creation to continuous compliance checking.

## Prerequisites

- A team provisioning nodes for Calico clusters
- Infrastructure-as-code practices
- Configuration management tools
- Shared documentation system

## Golden Image Requirements

Define a standard base image specification:

```yaml
# golden-image-spec.yaml

os_requirements:
  minimum_kernel: "5.10.0"
  distributions:
    - Ubuntu 22.04 LTS
    - RHEL 8 or later
  
kernel_modules:
  persistent:
    - ip_tables
    - ip6_tables
    - ip_set
    - ipt_ipvs
    - ipt_REJECT
    - ipt_rpfilter
    - ipt_set
    - nf_conntrack_netlink
    - vfio-pci
    - xt_addrtype
    - xt_bpf
    - xt_conntrack
    - xt_icmp
    - xt_icmp6
    - xt_mark
    - xt_multiport
    - xt_rpfilter
    - xt_set
    - xt_u32
  mode_specific:
    - vxlan
    - ipip

sysctl_parameters:
  net.ipv4.ip_forward: "1"
  net.ipv6.conf.all.forwarding: "1"

packages:
  required:
    - iproute2
    - iptables
    - ipset
  optional:
    - ipvsadm  # If using IPVS mode
```

## Image Validation Script

```bash
#!/bin/bash
# validate-golden-image.sh
# Run this as part of image build CI/CD

echo "=== Golden Image Validation ==="

ERRORS=0

# Check kernel version
KERNEL=$(uname -r | cut -d- -f1)
MIN_KERNEL="5.10.0"
echo "Kernel: $KERNEL (minimum: $MIN_KERNEL)"
if [ "$(printf '%s\n' "$MIN_KERNEL" "$KERNEL" | sort -V | head -n1)" != "$MIN_KERNEL" ]; then
  echo "  FAIL: kernel version is below $MIN_KERNEL"
  ERRORS=$((ERRORS + 1))
fi

# Check modules can be loaded
MODULES="ip_tables ip6_tables ip_set ipt_ipvs ipt_REJECT ipt_rpfilter ipt_set nf_conntrack_netlink vfio-pci xt_addrtype xt_bpf xt_conntrack xt_icmp xt_icmp6 xt_mark xt_multiport xt_rpfilter xt_set xt_u32 vxlan ipip"
for MOD in $MODULES; do
  if modprobe "$MOD" 2>/dev/null; then
    echo "  OK: $MOD"
  else
    echo "  FAIL: $MOD"
    ERRORS=$((ERRORS + 1))
  fi
done

# Run calicoctl checksystem
echo ""
CHECKSYSTEM_OUTPUT=$(calicoctl node checksystem 2>&1)
CHECKSYSTEM_STATUS=$?
echo "$CHECKSYSTEM_OUTPUT"
CHECKSYSTEM_ERRORS=$(echo "$CHECKSYSTEM_OUTPUT" | grep -c "FAIL")
if [ "$CHECKSYSTEM_STATUS" -ne 0 ] && [ "$CHECKSYSTEM_ERRORS" -eq 0 ]; then
  CHECKSYSTEM_ERRORS=1
fi
ERRORS=$((ERRORS + CHECKSYSTEM_ERRORS))

echo ""
echo "Total errors: $ERRORS"
exit $ERRORS
```

## Node Admission Gate

Prevent nodes from joining the cluster unless they pass system checks:

```bash
#!/bin/bash
# node-admission-check.sh
# Run this before allowing a node to join the Kubernetes cluster

NODE_NAME="$1"

echo "Running admission checks for $NODE_NAME..."

# Run checksystem
RESULT=$(ssh "$NODE_NAME" "sudo calicoctl node checksystem 2>&1")
STATUS=$?
ERRORS=$(echo "$RESULT" | grep -c "FAIL")

if [ "$STATUS" -ne 0 ] || [ "$ERRORS" -gt 0 ]; then
  echo "REJECTED: Node $NODE_NAME has $ERRORS system requirement errors"
  echo "$RESULT" | grep "FAIL" || echo "$RESULT"
  echo ""
  echo "Fix these issues before joining the node to the cluster."
  exit 1
fi

echo "APPROVED: Node $NODE_NAME meets all requirements"
echo "Proceeding with cluster join..."
```

## Continuous Compliance Monitoring

```bash
#!/bin/bash
# weekly-compliance-check.sh
# Run weekly to detect system configuration drift

REPORT_FILE="/tmp/system-compliance-$(date +%Y%m%d).txt"

{
  echo "System Compliance Report - $(date)"
  echo "========================="
  echo ""
  
  NODES=$(kubectl get nodes -o jsonpath='{range .items[*]}{.metadata.name}{"\n"}{end}')
  TOTAL=0
  COMPLIANT=0
  
  for NODE in $NODES; do
    TOTAL=$((TOTAL + 1))
    
    echo "Node: $NODE"
    
    RESULT=$(ssh "$NODE" "sudo calicoctl node checksystem 2>&1")
    STATUS=$?
    ERRORS=$(echo "$RESULT" | grep -c "FAIL")
    if [ "$STATUS" -eq 0 ] && [ "$ERRORS" -eq 0 ]; then
      echo "  Status: COMPLIANT"
      COMPLIANT=$((COMPLIANT + 1))
    elif [ "$ERRORS" -gt 0 ]; then
      echo "  Status: NON-COMPLIANT ($ERRORS failures)"
    else
      echo "  Status: UNKNOWN (checksystem command failed)"
    fi
  done
  
  echo ""
  echo "Summary: $COMPLIANT/$TOTAL nodes compliant"
} > "$REPORT_FILE"

cat "$REPORT_FILE"
```

## Verification

Test the standardized workflow:

```bash
# Validate golden image
sudo ./validate-golden-image.sh

# Run admission check on a new node
./node-admission-check.sh new-worker-01

# Run compliance check
./weekly-compliance-check.sh
```

## Troubleshooting

- **Golden image passes but new nodes fail**: Cloud providers may modify kernel parameters during instance launch. Add cloud-init scripts to re-apply settings.
- **Compliance check shows drift on old nodes**: Kernel updates may change module availability. Include the check in your patch management workflow.
- **Different nodes need different configurations**: Create node profiles (compute, GPU, storage) with specific module requirements for each.

## Conclusion

Standardizing system requirement validation with `calicoctl node checksystem` ensures that every node in your cluster provides a consistent foundation for Calico networking. By embedding these checks into image builds, node admission, and continuous compliance monitoring, your team prevents system-level configuration issues from causing networking failures.
