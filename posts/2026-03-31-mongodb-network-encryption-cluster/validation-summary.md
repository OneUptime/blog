# Validation Summary: How to Implement Network Encryption Between MongoDB Cluster Members

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (replica sets, sharded clusters)
- TLS/SSL encryption
- OpenSSL (certificate generation)
- x.509 certificate authentication
- mongosh (MongoDB Shell)

## Sources Consulted
- MongoDB Configuration File Options: https://www.mongodb.com/docs/manual/reference/configuration-options/
- MongoDB x.509 Authentication: https://www.mongodb.com/docs/manual/core/security-x.509/
- Configure x.509 Member Authentication: https://www.mongodb.com/docs/manual/tutorial/configure-x509-member-authentication/
- Upgrade a Cluster to Use TLS/SSL: https://www.mongodb.com/docs/manual/tutorial/upgrade-cluster-to-ssl/
- connectionStatus Command Reference: https://www.mongodb.com/docs/manual/reference/command/connectionstatus/

## Issues Found

1. **`clusterAuthMode` incorrectly placed under `net.tls`**: The first configuration example had `clusterAuthMode: x509` nested under `net.tls`, but this option belongs under `security` in mongod.conf. This would cause a mongod startup error. Removed it from the first config block since it is correctly shown under `security` in the dedicated x.509 section below.

2. **Certificate subject missing required attributes for x.509 member auth**: The CSR creation command used `-subj "/CN=node1.example.com"` which lacks the Organization (O), Organizational Unit (OU), or Domain Component (DC) attributes required by MongoDB for x.509 member authentication. Without at least one of these attributes, MongoDB cannot validate cluster membership. Changed to `-subj "/O=MongoDB Cluster/OU=Internal/CN=node1.example.com"`.

3. **Misleading description for `connectionStatus` command**: The post described `db.runCommand({ connectionStatus: 1 })` as checking "connection security", implying it verifies TLS encryption. This command actually returns authentication information (authenticated users and roles), not TLS/encryption details. Updated the description to accurately state it confirms x.509 authentication is working.

## Review Notes
- The rolling upgrade sequence (allowTLS -> preferTLS -> requireTLS) is correct per MongoDB documentation.
- The `net.tls.allowInvalidHostnames: false` setting in the x.509 config section is the default value; including it is fine for clarity but not strictly necessary.
- The post could benefit from mentioning that cluster member certificates must all share the same O, OU, and DC values, and that client certificates must differ in at least one of these attributes. This is a common pitfall but not a technical error in the current text.
- The `connectionStatus` command may show an undocumented `ssl: { running: true }` field in some MongoDB versions, but this is not part of the official command output and should not be relied upon.
