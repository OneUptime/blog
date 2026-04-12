# Validation Summary: How to Configure MongoDB Network Access and Firewall Rules

## Status
validated

## Post Type
Guide

## Technologies Covered
- MongoDB (self-managed `mongod` configuration)
- MongoDB Atlas (IP access lists, VPC Peering, Private Endpoints)
- MongoDB Atlas CLI (`atlas accessLists create`)
- Linux firewall tools: ufw, firewalld, iptables
- AWS EC2 Security Groups (AWS CLI)
- TLS/SSL for MongoDB connections

## Sources Consulted
- MongoDB documentation: `net` configuration options (`bindIp`, `bindIpAll`, `tls`) — https://www.mongodb.com/docs/manual/reference/configuration-options/#net-options
- MongoDB documentation: default bind to localhost starting in 3.6 — https://www.mongodb.com/docs/manual/core/security-mongodb-configuration/
- MongoDB Atlas CLI reference: `atlas accessLists create` — https://www.mongodb.com/docs/atlas/cli/current/command/atlas-accessLists-create/
- MongoDB Atlas documentation: IP Access List — https://www.mongodb.com/docs/atlas/security/ip-access-list/
- AWS CLI reference: `authorize-security-group-ingress` — https://docs.aws.amazon.com/cli/latest/reference/ec2/authorize-security-group-ingress.html
- ufw man page and Ubuntu documentation
- firewalld rich rules documentation — https://firewalld.org/documentation/man-pages/firewalld.richlanguage.html
- iptables documentation

## Issues Found

### 1. Atlas CLI: `--entry` is not a valid flag (all three Atlas CLI examples)
- **What was wrong:** All three `atlas accessLists create` examples used `--entry <value>` to specify the IP address or CIDR block. However, `--entry` is not a valid flag — the entry is a positional argument.
- **What was changed:** Moved the IP/CIDR value from `--entry <value>` to a positional argument immediately after `atlas accessLists create`.
- **Why:** The Atlas CLI `accessLists create` command expects the entry as `atlas accessLists create <entry> [flags]`, not as a named `--entry` flag.

### 2. Atlas CLI: `--deleteAfterDate` should be `--deleteAfter`
- **What was wrong:** The temporary access example used `--deleteAfterDate` as the flag name.
- **What was changed:** Replaced `--deleteAfterDate` with `--deleteAfter`.
- **Why:** The correct Atlas CLI flag name is `--deleteAfter`, not `--deleteAfterDate`. (The Atlas API uses `deleteAfterDate` as a field name, which may have caused the confusion.)

## Review Notes
- The temporary access example uses a date of `2024-12-31T23:59:59Z`, which is in the past relative to the blog's publication date (2026-03-31). This is not a technical error since it's illustrative, but readers may find a future date less confusing.
- The MongoDB configuration, ufw, firewalld, iptables, and AWS Security Group sections are all technically correct.
- The mongod.conf YAML structure correctly nests `tls` under `net`, matching the current MongoDB configuration format.
- The Mermaid flowchart accurately represents the connection flow through firewall and bindIp checks.
- The security checklist and best practices (private IPs only, TLS, authentication, VPC Peering) align with MongoDB's official security recommendations.
