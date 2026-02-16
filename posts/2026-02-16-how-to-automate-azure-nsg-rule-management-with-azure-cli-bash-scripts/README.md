# How to Automate Azure NSG Rule Management with Azure CLI Bash Scripts

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, NSG, Azure CLI, Bash, Automation, Networking, Security

Description: Automate the creation, auditing, and management of Azure Network Security Group rules using Azure CLI bash scripts for consistent network security.

---

Network Security Groups (NSGs) are the fundamental firewall layer in Azure networking. Every subnet and NIC can have an NSG that controls inbound and outbound traffic. Managing NSG rules manually through the portal works for small environments, but once you have dozens of NSGs across multiple subscriptions, you need automation. Azure CLI combined with bash scripts gives you a fast, scriptable way to create, audit, update, and report on NSG rules across your entire Azure estate.

This post covers practical bash scripts for common NSG management tasks - from bulk rule creation to compliance auditing.

## Prerequisites

You need the Azure CLI installed and authenticated.

```bash
# Login to Azure
az login

# Set your default subscription
az account set --subscription "your-subscription-id"

# Verify your context
az account show --output table
```

## Creating NSG Rules in Bulk

The most common automation task is creating multiple rules at once. Instead of running individual `az network nsg rule create` commands, define your rules in a structured format and loop through them.

```bash
#!/bin/bash
# create-nsg-rules.sh
# Creates NSG rules from a CSV-like definition

set -euo pipefail

RESOURCE_GROUP="rg-networking"
NSG_NAME="nsg-web-tier"

# Define rules: name,priority,direction,access,protocol,source,dest_port
# Each line represents one rule
RULES=(
  "Allow-HTTPS-Inbound,100,Inbound,Allow,Tcp,*,443"
  "Allow-HTTP-Inbound,110,Inbound,Allow,Tcp,*,80"
  "Allow-SSH-From-Bastion,120,Inbound,Allow,Tcp,10.0.0.0/24,22"
  "Allow-HealthProbe,130,Inbound,Allow,Tcp,AzureLoadBalancer,*"
  "Deny-All-Inbound,4096,Inbound,Deny,*,*,*"
)

echo "Creating NSG rules for $NSG_NAME in $RESOURCE_GROUP"

for rule in "${RULES[@]}"; do
  # Split the comma-separated values
  IFS=',' read -r name priority direction access protocol source dest_port <<< "$rule"

  echo "  Creating rule: $name (priority $priority)"

  az network nsg rule create \
    --resource-group "$RESOURCE_GROUP" \
    --nsg-name "$NSG_NAME" \
    --name "$name" \
    --priority "$priority" \
    --direction "$direction" \
    --access "$access" \
    --protocol "$protocol" \
    --source-address-prefixes "$source" \
    --destination-port-ranges "$dest_port" \
    --output none

  echo "  Done: $name"
done

echo "All rules created successfully"
```

This script is idempotent - running it again will update existing rules rather than fail.

## Auditing NSG Rules Across All NSGs

Security teams frequently need to audit NSG rules across the entire subscription. This script lists all NSGs and their rules, highlighting any that allow traffic from the internet.

```bash
#!/bin/bash
# audit-nsg-rules.sh
# Audit all NSG rules and flag overly permissive ones

set -euo pipefail

echo "=== NSG Security Audit ==="
echo "Subscription: $(az account show --query name -o tsv)"
echo "Date: $(date -u '+%Y-%m-%d %H:%M UTC')"
echo ""

# Get all NSGs in the subscription
NSGS=$(az network nsg list --query "[].{name:name, rg:resourceGroup}" -o tsv)

ISSUES_FOUND=0

while IFS=$'\t' read -r nsg_name rg_name; do
  echo "--- NSG: $nsg_name (RG: $rg_name) ---"

  # Get all rules for this NSG
  RULES=$(az network nsg rule list \
    --resource-group "$rg_name" \
    --nsg-name "$nsg_name" \
    --query "[?access=='Allow'].{name:name, priority:priority, direction:direction, sourceAddressPrefix:sourceAddressPrefix, sourceAddressPrefixes:sourceAddressPrefixes, destPort:destinationPortRange, destPorts:destinationPortRanges, protocol:protocol}" \
    -o json)

  # Check for rules that allow any source
  OPEN_RULES=$(echo "$RULES" | jq -r '.[] | select(.sourceAddressPrefix == "*" or .sourceAddressPrefix == "Internet" or .sourceAddressPrefix == "0.0.0.0/0") | select(.direction == "Inbound") | "\(.name) (priority: \(.priority), port: \(.destPort), protocol: \(.protocol))"')

  if [ -n "$OPEN_RULES" ]; then
    echo "  WARNING - Inbound rules allowing traffic from any source:"
    echo "$OPEN_RULES" | while read -r line; do
      echo "    - $line"
    done
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
  else
    echo "  OK - No overly permissive inbound rules found"
  fi

  echo ""
done <<< "$NSGS"

echo "=== Audit Complete ==="
echo "NSGs with potential issues: $ISSUES_FOUND"

# Exit with non-zero status if issues found (useful in CI/CD)
if [ "$ISSUES_FOUND" -gt 0 ]; then
  exit 1
fi
```

Run this script in a CI/CD pipeline on a schedule to catch NSG changes that violate your security policies.

## Copying Rules Between NSGs

When you create a new environment, you often want to replicate the NSG rules from an existing one. This script copies rules from a source NSG to a target NSG.

```bash
#!/bin/bash
# copy-nsg-rules.sh
# Copy rules from one NSG to another

set -euo pipefail

SOURCE_RG="rg-networking-staging"
SOURCE_NSG="nsg-web-staging"
TARGET_RG="rg-networking-prod"
TARGET_NSG="nsg-web-prod"

echo "Copying rules from $SOURCE_NSG to $TARGET_NSG"

# Get all custom rules from the source (exclude default rules with priority >= 65000)
RULES=$(az network nsg rule list \
  --resource-group "$SOURCE_RG" \
  --nsg-name "$SOURCE_NSG" \
  --query "[?priority < \`65000\`]" \
  -o json)

# Count the rules
RULE_COUNT=$(echo "$RULES" | jq length)
echo "Found $RULE_COUNT rules to copy"

# Iterate over each rule and create it in the target
echo "$RULES" | jq -c '.[]' | while read -r rule; do
  name=$(echo "$rule" | jq -r '.name')
  priority=$(echo "$rule" | jq -r '.priority')
  direction=$(echo "$rule" | jq -r '.direction')
  access=$(echo "$rule" | jq -r '.access')
  protocol=$(echo "$rule" | jq -r '.protocol')
  source_prefix=$(echo "$rule" | jq -r '.sourceAddressPrefix // empty')
  source_prefixes=$(echo "$rule" | jq -r '.sourceAddressPrefixes | join(" ") // empty')
  dest_port=$(echo "$rule" | jq -r '.destinationPortRange // empty')
  dest_ports=$(echo "$rule" | jq -r '.destinationPortRanges | join(" ") // empty')

  echo "  Copying: $name (priority $priority)"

  # Build the command with conditional parameters
  CMD="az network nsg rule create --resource-group $TARGET_RG --nsg-name $TARGET_NSG --name $name --priority $priority --direction $direction --access $access --protocol $protocol --output none"

  if [ -n "$source_prefix" ]; then
    CMD="$CMD --source-address-prefixes $source_prefix"
  elif [ -n "$source_prefixes" ]; then
    CMD="$CMD --source-address-prefixes $source_prefixes"
  fi

  if [ -n "$dest_port" ]; then
    CMD="$CMD --destination-port-ranges $dest_port"
  elif [ -n "$dest_ports" ]; then
    CMD="$CMD --destination-port-ranges $dest_ports"
  fi

  eval "$CMD"
done

echo "All rules copied successfully"
```

## Temporarily Opening a Port

Sometimes you need to temporarily open a port for debugging or maintenance. This script creates a rule with a timestamp and can be paired with a scheduled cleanup.

```bash
#!/bin/bash
# temp-open-port.sh
# Temporarily open a port with an expiration comment

set -euo pipefail

RESOURCE_GROUP="${1:?Usage: temp-open-port.sh <resource-group> <nsg-name> <port> <source-ip> <duration-hours>}"
NSG_NAME="${2:?}"
PORT="${3:?}"
SOURCE_IP="${4:?}"
DURATION_HOURS="${5:-1}"

TIMESTAMP=$(date -u '+%Y%m%d-%H%M')
EXPIRY=$(date -u -d "+${DURATION_HOURS} hours" '+%Y-%m-%d %H:%M UTC' 2>/dev/null || date -u -v+${DURATION_HOURS}H '+%Y-%m-%d %H:%M UTC')
RULE_NAME="temp-${PORT}-${TIMESTAMP}"

echo "Creating temporary rule: $RULE_NAME"
echo "  Port: $PORT"
echo "  Source: $SOURCE_IP"
echo "  Expires: $EXPIRY"

az network nsg rule create \
  --resource-group "$RESOURCE_GROUP" \
  --nsg-name "$NSG_NAME" \
  --name "$RULE_NAME" \
  --priority 500 \
  --direction Inbound \
  --access Allow \
  --protocol Tcp \
  --source-address-prefixes "$SOURCE_IP" \
  --destination-port-ranges "$PORT" \
  --description "Temporary rule - expires $EXPIRY" \
  --output none

echo "Rule created. Remember to clean up after use."
echo "To delete: az network nsg rule delete --resource-group $RESOURCE_GROUP --nsg-name $NSG_NAME --name $RULE_NAME"
```

## Cleaning Up Temporary Rules

This companion script removes temporary rules that have expired.

```bash
#!/bin/bash
# cleanup-temp-rules.sh
# Remove temporary NSG rules that have expired

set -euo pipefail

echo "Scanning for expired temporary NSG rules..."

NSGS=$(az network nsg list --query "[].{name:name, rg:resourceGroup}" -o tsv)
CLEANED=0

while IFS=$'\t' read -r nsg_name rg_name; do
  # Find rules that start with "temp-"
  TEMP_RULES=$(az network nsg rule list \
    --resource-group "$rg_name" \
    --nsg-name "$nsg_name" \
    --query "[?starts_with(name, 'temp-')].{name:name, description:description}" \
    -o json)

  echo "$TEMP_RULES" | jq -c '.[]' | while read -r rule; do
    rule_name=$(echo "$rule" | jq -r '.name')
    description=$(echo "$rule" | jq -r '.description // ""')

    # Extract expiry date from description if present
    if echo "$description" | grep -q "expires"; then
      echo "  Found temporary rule: $rule_name in $nsg_name"
      echo "    Description: $description"
      echo "    Deleting..."

      az network nsg rule delete \
        --resource-group "$rg_name" \
        --nsg-name "$nsg_name" \
        --name "$rule_name" \
        --output none

      CLEANED=$((CLEANED + 1))
    fi
  done
done <<< "$NSGS"

echo "Cleaned up $CLEANED temporary rules"
```

## Generating an NSG Report

For compliance and documentation, this script generates a markdown report of all NSG rules.

```bash
#!/bin/bash
# generate-nsg-report.sh
# Generate a markdown report of all NSG rules

set -euo pipefail

REPORT_FILE="nsg-report-$(date -u '+%Y%m%d').md"

{
  echo "# NSG Rules Report"
  echo "Generated: $(date -u '+%Y-%m-%d %H:%M UTC')"
  echo "Subscription: $(az account show --query name -o tsv)"
  echo ""

  NSGS=$(az network nsg list --query "[].{name:name, rg:resourceGroup, location:location}" -o tsv)

  while IFS=$'\t' read -r nsg_name rg_name location; do
    echo "## $nsg_name"
    echo "- Resource Group: $rg_name"
    echo "- Location: $location"
    echo ""
    echo "| Priority | Name | Direction | Access | Protocol | Source | Dest Port |"
    echo "|----------|------|-----------|--------|----------|--------|-----------|"

    az network nsg rule list \
      --resource-group "$rg_name" \
      --nsg-name "$nsg_name" \
      --query "sort_by([?priority < \`65000\`], &priority)" \
      -o json | jq -r '.[] | "| \(.priority) | \(.name) | \(.direction) | \(.access) | \(.protocol) | \(.sourceAddressPrefix // (.sourceAddressPrefixes | join(","))) | \(.destinationPortRange // (.destinationPortRanges | join(","))) |"'

    echo ""
  done <<< "$NSGS"
} > "$REPORT_FILE"

echo "Report saved to $REPORT_FILE"
```

## Best Practices for NSG Automation

Always use `set -euo pipefail` at the top of your scripts. NSG changes affect network connectivity, and a silent failure could leave your environment in an inconsistent state.

Use descriptive rule names that include the purpose and the ticket number. A rule named `Allow-HTTPS-Inbound` is much easier to audit than `Rule-100`.

Keep priority ranges organized. For example, use 100-199 for web traffic rules, 200-299 for management traffic, 300-399 for application-specific rules, and 4000-4095 for explicit deny rules.

Test your scripts against a non-production NSG first. A script bug that deletes all NSG rules will instantly disconnect everything attached to that NSG.

Version control your scripts and the rule definitions. Treat NSG rules as code, with the same review and approval process as your application deployments.

## Conclusion

Azure CLI bash scripts give you a lightweight but powerful way to manage NSG rules at scale. From bulk creation to compliance auditing to temporary access management, these scripts cover the common operational tasks that network and security teams face daily. They are easy to integrate into CI/CD pipelines, run on schedules, or use as part of incident response procedures.
