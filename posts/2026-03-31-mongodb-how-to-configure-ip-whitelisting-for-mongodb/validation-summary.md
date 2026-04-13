# Validation Summary: How to Configure IP Whitelisting for MongoDB

## Status
validated

## Post Type
Guide

## Technologies Covered
- MongoDB (mongod.conf `bindIp` configuration)
- iptables (Linux firewall)
- UFW (Ubuntu Uncomplicated Firewall)
- MongoDB Atlas Admin API (IP Access List)
- mongosh (MongoDB Shell)

## Sources Consulted
- MongoDB documentation on `net.bindIp` configuration: https://www.mongodb.com/docs/manual/reference/configuration-options/#mongodb-setting-net.bindIp
- mongosh connection string documentation: https://www.mongodb.com/docs/mongodb-shell/connect/
- MongoDB Atlas Admin API (IP Access List): https://www.mongodb.com/docs/atlas/reference/api-resources-spec/v1/#tag/Project-IP-Access-List
- iptables man page and documentation
- UFW documentation: https://help.ubuntu.com/community/UFW
- MongoDB `currentOp` command documentation: https://www.mongodb.com/docs/manual/reference/command/currentOp/

## Issues Found

1. **Misleading description of `bindIp` behavior (line 26):**
   - **What was wrong:** The post stated "Connections from any other IP are refused at the TCP level," implying `bindIp` filters by source IP address. In reality, `bindIp` controls which network interfaces MongoDB listens on. Any source IP that can route to a bound interface can still connect; connections to *unbound* interfaces are refused because MongoDB is simply not listening there.
   - **What was changed:** Rephrased to "Connections to any other interface are refused at the TCP level since MongoDB is not listening there."
   - **Why:** The original phrasing could mislead readers into thinking `bindIp` acts as a source IP filter (like a firewall rule), when it only restricts the listening interface. This distinction matters for security: `bindIp` alone does not whitelist source IPs.

2. **Invalid `mongosh` CLI flag `--connectTimeoutMS` (line 98):**
   - **What was wrong:** The command `mongosh --host 10.0.0.1 --port 27017 --connectTimeoutMS 3000` uses `--connectTimeoutMS`, which is not a recognized mongosh CLI option.
   - **What was changed:** Replaced with `mongosh "mongodb://10.0.0.1:27017/?connectTimeoutMS=3000"` using a connection string URI, which is the correct way to pass connection options like `connectTimeoutMS` to mongosh.
   - **Why:** Running the original command would produce an unrecognized option error rather than the intended timeout behavior.

## Review Notes
- The Atlas API example uses v1.0 (`/api/atlas/v1.0/`). MongoDB recommends the v2 API (`/api/atlas/v2/`) for new integrations. The v1.0 endpoint still works but may be deprecated in the future.
- The term "IP whitelisting" is being replaced by "IP access list" across the industry and in MongoDB's own documentation. The post's Atlas section correctly uses the newer terminology, but the overall title and framing still use "whitelisting."
- The `iptables-save` persistence path `/etc/iptables/rules.v4` is specific to Debian/Ubuntu with the `iptables-persistent` package installed. On other distributions (RHEL/CentOS), persistence is handled differently (e.g., via `iptables-services`).
