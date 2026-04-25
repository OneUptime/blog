# How to Create Subnets and Assign IPv4 Addresses in phpIPAM

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: phpIPAM, IPAM, IPv4, Subnets, IP Management, Networking

Description: Create subnet hierarchies and assign IPv4 addresses to hosts in phpIPAM using both the web interface and REST API.

Once phpIPAM is installed, the primary workflow involves creating a logical subnet hierarchy and assigning IP addresses to hosts, devices, or services within those subnets.

## Creating a Subnet Hierarchy

Good IPAM organization mirrors your network design:

```text
Section: Corporate Network
  ├── Subnet: 10.0.0.0/8   (Summary)
  │     ├── 10.100.0.0/16  (Production)
  │     │     ├── 10.100.1.0/24  (Web Tier)
  │     │     ├── 10.100.2.0/24  (App Tier)
  │     │     └── 10.100.3.0/24  (DB Tier)
  │     └── 10.200.0.0/16  (Development)
```

## Creating Subnets via Web UI

1. Navigate to **Subnets** in the top menu
2. Select your section
3. Click **+ Add subnet**
4. Enter:
   - **Subnet**: `10.100.1.0`
   - **Mask**: `24`
   - **Description**: Web Tier
   - **VLAN**: Select if applicable
5. Click **Add**

## Creating Subnets via API

```bash
BASE="http://localhost/api/myapp"
TOKEN="your-api-token" # Retrieved from POST /api/myapp/user/

# Create parent subnet

curl -X POST \
  -H "token: $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "subnet": "10.100.0.0",
    "mask": "16",
    "sectionId": "1",
    "description": "Production Network"
  }' \
  "$BASE/subnets/"

# Get the ID of the parent subnet
PARENT_ID=$(curl -H "token: $TOKEN" \
  "$BASE/subnets/search/10.100.0.0/16/" \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['data'][0]['id'])")

# Create child subnet under the parent
curl -X POST \
  -H "token: $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"subnet\": \"10.100.1.0\",
    \"mask\": \"24\",
    \"sectionId\": \"1\",
    \"masterSubnetId\": \"$PARENT_ID\",
    \"description\": \"Web Tier\"
  }" \
  "$BASE/subnets/"
```

## Assigning an IP Address to a Host

Via the web UI:
1. Click on a subnet to open it
2. Click an unoccupied IP address
3. Select **Add IP**
4. Fill in hostname, description, and status
5. Save

Via API:

```bash
# Get the subnet ID
SUBNET_ID=$(curl -H "token: $TOKEN" \
  "$BASE/subnets/search/10.100.1.0/24/" \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['data'][0]['id'])")

# Assign 10.100.1.10 to a host
curl -X POST \
  -H "token: $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"subnetId\": \"$SUBNET_ID\",
    \"ip\": \"10.100.1.10\",
    \"hostname\": \"web01.corp.example.com\",
    \"description\": \"Production Web Server 01\",
    \"tag\": \"1\"
  }" \
  "$BASE/addresses/"
```

## Getting the Next Available IP

```bash
# Get the first available IP in a subnet
curl -H "token: $TOKEN" \
  "$BASE/subnets/$SUBNET_ID/first_free/" \
  | python3 -m json.tool
# Returns: "data": "10.100.1.11"
```

## Searching for an IP Address

```bash
# Search for a specific IP
curl -H "token: $TOKEN" \
  "$BASE/addresses/search/10.100.1.10/" \
  | python3 -m json.tool | grep -E "\"hostname\"|\"description\"|\"ip\""
```

## Viewing Subnet Utilization

```bash
# Get utilization stats for a subnet
curl -H "token: $TOKEN" \
  "$BASE/subnets/$SUBNET_ID/usage/" \
  | python3 -m json.tool
# Returns keys such as: used, freehosts, maxhosts, Used_percent, freehosts_percent
```

phpIPAM's nested subnet structure with first-free IP lookup makes it easy to integrate into provisioning automation while maintaining a visual overview of address space utilization.
