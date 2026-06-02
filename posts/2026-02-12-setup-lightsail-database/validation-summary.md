# Validation Summary: How to Set Up a Lightsail Database

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon Lightsail managed databases
- AWS CLI
- MySQL
- PostgreSQL
- Node.js with mysql2
- Python with psycopg2

## Sources Consulted
- Amazon Lightsail database engine selection guide: https://docs.aws.amazon.com/lightsail/latest/userguide/amazon-lightsail-choosing-a-database.html
- Amazon Lightsail managed database pricing: https://aws.amazon.com/lightsail/pricing/
- AWS CLI create-relational-database command reference: https://docs.aws.amazon.com/cli/latest/reference/lightsail/create-relational-database.html
- AWS CLI update-relational-database command reference: https://docs.aws.amazon.com/cli/latest/reference/lightsail/update-relational-database.html
- AWS CLI update-relational-database-parameters command reference: https://docs.aws.amazon.com/cli/latest/reference/lightsail/update-relational-database-parameters.html
- AWS CLI get-relational-database-metric-data command reference: https://docs.aws.amazon.com/cli/latest/reference/lightsail/get-relational-database-metric-data.html
- AWS CLI create-relational-database-from-snapshot command reference: https://docs.aws.amazon.com/cli/latest/reference/lightsail/create-relational-database-from-snapshot.html
- Amazon Lightsail public database access guide: https://docs.aws.amazon.com/lightsail/latest/userguide/amazon-lightsail-configuring-database-public-mode.html
- Amazon Lightsail MySQL connection guide: https://docs.aws.amazon.com/lightsail/latest/userguide/amazon-lightsail-connecting-to-your-mysql-database.html
- Amazon Lightsail MySQL slow query log guide: https://docs.aws.amazon.com/lightsail/latest/userguide/amazon-lightsail-enabling-mysql-general-and-slow-query-logs.html
- Amazon Lightsail database FAQ: https://docs.aws.amazon.com/lightsail/latest/userguide/amazon-lightsail-faq-databases.html

## Issues Found
- The database version list was outdated. Updated PostgreSQL from "PostgreSQL 14 (and older versions)" to "PostgreSQL 16 (and older supported versions)" and removed the implication that older MySQL versions are generally available for new databases.
- The pricing table omitted current larger managed database bundles. Added the 16GB and 32GB database plans with their current storage, transfer, standard, and high availability prices.
- The example master passwords contained `@`, which Lightsail disallows for relational database master passwords. Replaced `@` with `#` in all AWS CLI password examples.
- The private database connection description was too broad. Clarified that private Lightsail databases are reachable from Lightsail resources in the same account and region.
- The parameters section referred to "parameter groups," which is RDS terminology and not how Lightsail presents this operation. Changed it to "database parameters."
- The `slow_query_log` example used `applyMethod: immediate`, but AWS's Lightsail slow-query-log guidance uses `pending-reboot`. Updated the example and clarified the reboot command text.

## Review Notes
AWS CLI was not installed in the local workspace, so command verification was performed against the current official AWS CLI command reference and Amazon Lightsail documentation. The application examples are syntactically plausible, but the hostnames are placeholders and require real Lightsail endpoint values.
