# How to Configure IP Access Lists in ClickHouse Cloud

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, ClickHouse Cloud, IP Access List, Network Security, Firewall, Access Control

Description: Learn how to configure IP allowlists in ClickHouse Cloud to restrict service access to specific IP addresses or CIDR ranges.

---

ClickHouse Cloud supports IP access lists (allowlists) to restrict which IP addresses or CIDR ranges can connect to your service. This is a simple and effective first layer of network security, especially for services exposed to the public internet.

## Viewing Current IP Access List

In the ClickHouse Cloud console, go to your service, then "Security" - "IP Access List". By default, all IPs are allowed.

Via the API:

```bash
curl https://api.clickhouse.cloud/v1/organizations/{orgId}/services/{serviceId} \
  -H "Authorization: Bearer $CLICKHOUSE_API_KEY" \
  | jq '.result.ipAccessList'
```

## Adding IP Restrictions via the Console

1. Open your service in the console
2. Navigate to "Security" - "IP Access List"
3. Click "Add entry"
4. Enter an IP address (e.g., `203.0.113.42/32`) or CIDR block (e.g., `10.0.0.0/8`)
5. Add a description and save

## Configuring Access Lists via the API

```bash
curl -X PATCH \
  https://api.clickhouse.cloud/v1/organizations/{orgId}/services/{serviceId} \
  -H "Authorization: Bearer $CLICKHOUSE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "ipAccessList": {
      "add": [
        {"source": "203.0.113.0/24", "description": "Office network"},
        {"source": "10.0.0.0/8", "description": "Internal VPC"},
        {"source": "198.51.100.42/32", "description": "CI/CD runner"}
      ]
    }
  }'
```

To remove existing entries, use the `remove` array (you can combine `add` and `remove` in the same request):

```bash
curl -X PATCH \
  https://api.clickhouse.cloud/v1/organizations/{orgId}/services/{serviceId} \
  -H "Authorization: Bearer $CLICKHOUSE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "ipAccessList": {
      "remove": [
        {"source": "198.51.100.42/32", "description": "CI/CD runner"}
      ]
    }
  }'
```

## Allowing All IPs (Open Access)

To temporarily allow all connections (useful for testing, not recommended for production):

```bash
curl -X PATCH \
  https://api.clickhouse.cloud/v1/organizations/{orgId}/services/{serviceId} \
  -H "Authorization: Bearer $CLICKHOUSE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "ipAccessList": {
      "add": [{"source": "0.0.0.0/0", "description": "Allow all"}]
    }
  }'
```

## Common Use Cases

```text
Office IP:          203.0.113.1/32
Office subnet:      203.0.113.0/24
AWS NAT gateway:    52.x.x.x/32
GitHub Actions:     (use published IP ranges from GitHub API)
All private RFC:    10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16
```

## Getting Your Current Public IP

```bash
curl -s https://checkip.amazonaws.com
```

## Best Practices

- Always use CIDR notation for subnets rather than listing individual IPs
- Add descriptions to every entry so you can identify them later
- Pair IP allowlisting with private endpoints for production environments
- Review and audit the access list quarterly

## Summary

IP access lists in ClickHouse Cloud provide allowlist-based network access control. Configure them through the console or API with specific IP addresses or CIDR ranges. Use them alongside private endpoints and TLS for a layered network security approach.
