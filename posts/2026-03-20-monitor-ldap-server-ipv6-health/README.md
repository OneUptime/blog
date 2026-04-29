# How to Monitor LDAP Server IPv6 Health

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: LDAP, IPv6, Monitoring, Prometheus, Health Check, OpenLDAP, Alerting

Description: Monitor LDAP server availability and performance over IPv6 using Prometheus, custom health check scripts, and alerting to ensure directory service reliability.

---

Monitoring LDAP server health over IPv6 involves checking port reachability, authentication success, query response times, and replication status. This guide covers monitoring approaches from simple scripts to full Prometheus observability.

## Basic LDAP Health Checks

```bash
#!/bin/bash
# ldap_health_check_ipv6.sh

LDAP_SERVER="2001:db8::1"
LDAP_PORT=389
BIND_DN="cn=admin,dc=example,dc=com"
BIND_PW="adminpassword"
BASE_DN="dc=example,dc=com"

# Check 1: Port reachability over IPv6

check_port() {
  if nc -6 -w 3 "$LDAP_SERVER" "$LDAP_PORT" < /dev/null > /dev/null 2>&1; then
    echo "OK: LDAP port $LDAP_PORT reachable on [$LDAP_SERVER]"
    return 0
  else
    echo "CRITICAL: Cannot reach LDAP port $LDAP_PORT on [$LDAP_SERVER]"
    return 2
  fi
}

# Check 2: Anonymous bind
check_anon_bind() {
  result=$(ldapsearch -H "ldap://[$LDAP_SERVER]:$LDAP_PORT" \
    -x -b "" -s base "(objectClass=*)" namingContexts 2>&1)

  if echo "$result" | grep -q "namingContexts"; then
    echo "OK: Anonymous bind successful"
    return 0
  else
    echo "WARNING: Anonymous bind failed"
    return 1
  fi
}

# Check 3: Authenticated bind and query
check_auth_query() {
  local start_time end_time duration
  start_time=$(date +%s%N)

  result=$(ldapsearch -H "ldap://[$LDAP_SERVER]:$LDAP_PORT" \
    -D "$BIND_DN" -w "$BIND_PW" \
    -b "$BASE_DN" "(objectClass=domain)" dn 2>&1)

  end_time=$(date +%s%N)
  duration=$(( (end_time - start_time) / 1000000 ))

  if echo "$result" | grep -q "dn:"; then
    echo "OK: Auth query successful (${duration}ms)"
    return 0
  else
    echo "CRITICAL: Auth query failed"
    return 2
  fi
}

check_port
check_anon_bind
check_auth_query
```

## Prometheus LDAP Exporter

The `openldap_exporter` exposes LDAP metrics for Prometheus:

```bash
# Install openldap_exporter
wget https://github.com/tomcz/openldap_exporter/releases/latest/download/openldap_exporter-linux-amd64.gz
gunzip openldap_exporter-linux-amd64.gz
chmod +x openldap_exporter-linux-amd64
sudo mv openldap_exporter-linux-amd64 /usr/local/bin/openldap_exporter

# Run with IPv6 LDAP server
openldap_exporter \
  --promAddr="[::]:9330" \
  --ldapAddr="[2001:db8::1]:389" \
  --ldapUser="cn=admin,dc=example,dc=com" \
  --ldapPass="adminpassword"
```

Configure Prometheus:

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'ldap_servers'
    static_configs:
      - targets:
          - '[2001:db8::1]:9330'
          - '[2001:db8::2]:9330'
```

## OpenLDAP Monitor Backend

OpenLDAP has a built-in monitoring database:

```bash
# Enable the monitor backend
cat > /tmp/monitor.ldif << 'EOF'
dn: olcDatabase=monitor,cn=config
changetype: add
objectClass: olcDatabaseConfig
objectClass: olcMonitorConfig
olcDatabase: monitor
olcAccess: {0}to * by dn.exact="cn=admin,dc=example,dc=com" read by * none
EOF

sudo ldapmodify -Y EXTERNAL -H ldapi:/// -f /tmp/monitor.ldif

# Query monitor data over IPv6
ldapsearch -H ldap://[2001:db8::1]:389 \
  -D "cn=admin,dc=example,dc=com" \
  -w adminpassword \
  -b "cn=Monitor" "(objectClass=*)" \
  cn monitoredInfo | grep -E "cn:|monitored"
```

## Alerting Rules for LDAP Health

```yaml
# /etc/prometheus/rules/ldap_alerts.yml
groups:
  - name: ldap_health
    rules:
      - alert: LDAPServerDown
        expr: up{job="ldap_servers"} == 0
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "LDAP server down: {{ $labels.instance }}"

      - alert: LDAPHighQueryLatency
        expr: ldap_query_duration_seconds > 1.0
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High LDAP query latency on {{ $labels.instance }}"
          description: "Query latency is {{ $value }}s"

      - alert: LDAPReplicationLag
        expr: ldap_replication_lag_seconds > 60
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "LDAP replication lagging on {{ $labels.instance }}"
```

## Checking Replication Status over IPv6

```bash
# Compare contextCSN between provider and consumer
PROVIDER_CSN=$(ldapsearch -H ldap://[2001:db8::10]:389 -x \
  -b "dc=example,dc=com" -s base "(objectClass=*)" contextCSN \
  | grep contextCSN | awk '{print $2}')

CONSUMER_CSN=$(ldapsearch -H ldap://[2001:db8::11]:389 -x \
  -b "dc=example,dc=com" -s base "(objectClass=*)" contextCSN \
  | grep contextCSN | awk '{print $2}')

if [ "$PROVIDER_CSN" = "$CONSUMER_CSN" ]; then
  echo "Replication: IN SYNC"
else
  echo "Replication: OUT OF SYNC"
  echo "Provider: $PROVIDER_CSN"
  echo "Consumer: $CONSUMER_CSN"
fi
```

Comprehensive LDAP monitoring over IPv6 ensures your directory service remains available and performant, catching issues before they impact authentication and authorization for your entire user base.
