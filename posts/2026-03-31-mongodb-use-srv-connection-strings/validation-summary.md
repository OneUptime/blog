# Validation Summary: How to Use SRV Connection Strings for MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (connection strings, SRV format, replica sets)
- DNS SRV and TXT records
- MongoDB Atlas
- Node.js MongoDB driver
- Python PyMongo driver
- DNS utilities (dig)

## Sources Consulted
- MongoDB Connection String Formats documentation: https://www.mongodb.com/docs/manual/reference/connection-string-formats/
- MongoDB Initial DNS Seedlist Discovery Specification: https://github.com/mongodb/specifications/blob/master/source/initial-dns-seedlist-discovery/initial-dns-seedlist-discovery.md
- Node.js MongoDB Driver TLS documentation: https://www.mongodb.com/docs/drivers/node/current/security/tls/
- Node.js MongoDB Driver Cluster Monitoring documentation: https://www.mongodb.com/docs/drivers/node/v6.14/monitoring-and-logging/monitoring/cluster-monitoring/
- Node.js MongoDB Driver source (MongoClient): https://github.com/mongodb/node-mongodb-native/blob/main/src/mongo_client.ts
- PyMongo changelog: https://pymongo.readthedocs.io/en/stable/changelog.html

## Issues Found
1. **SRV port limitation was misleading**: The post stated "The default port for SRV is 27017 and cannot be changed via the URI." This conflates two things. While you cannot specify a port in a `mongodb+srv://` URI (the driver raises a parse error), the actual ports are determined by the SRV records and can be any valid port -- not just 27017. The MongoDB specification itself includes examples with SRV records pointing to non-27017 ports. Fixed to: "You cannot specify a port in a `mongodb+srv://` URI - ports are determined by the SRV records."

2. **PyMongo `[srv]` extra is outdated**: The post recommended `pip install "pymongo[srv]"` for SRV support. Since PyMongo 4.3, `dnspython` is a required dependency installed automatically with `pip install pymongo`. The `[srv]` extra was formally removed in PyMongo 4.7. Updated the install command and added a note that `dnspython` is now included by default.

3. **`client.topology` is an internal API**: The "Verifying SRV Resolution" section used `client.topology.description.servers`, which is marked `@internal` in the Node.js driver source and is not part of the public API. Replaced with the recommended SDAM (Server Discovery and Monitoring) event approach using `client.on("topologyDescriptionChanged", ...)`.

## Review Notes
- The `srvServiceName` URI option (which allows customizing the SRV prefix from the default `_mongodb._tcp`) is not mentioned. This is fine for an introductory post but could be a useful addition for advanced users configuring non-standard setups.
- The SRV record TTL of 300 seconds in the self-managed example is reasonable but readers should be aware that lower TTLs increase DNS query volume while higher TTLs delay failover detection.
