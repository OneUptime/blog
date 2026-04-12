# Validation Summary: How to Automate MySQL Deployments with Chef

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL 8.0
- Chef Infra (configuration management)
- Chef `mysql` cookbook (~> 8.0, from sous-chefs)
- Chef `database` cookbook (~> 6.0)
- Berkshelf (dependency management)
- Test Kitchen (integration testing)
- Vagrant (test driver)
- Knife (Chef CLI tool)
- Encrypted data bags (secrets management)

## Sources Consulted
- Chef Supermarket `mysql` cookbook documentation (https://supermarket.chef.io/cookbooks/mysql)
- Chef Supermarket `database` cookbook documentation (https://supermarket.chef.io/cookbooks/database)
- sous-chefs/mysql GitHub repository for resource documentation (mysql_service, mysql_config)
- Chef Infra documentation on encrypted data bags and `data_bag_item` helper
- Chef Infra documentation on Test Kitchen configuration

## Issues Found
1. **Incorrect configuration resource for mysql_service instance**: The post used a raw `template` resource targeting `/etc/mysql/mysql.conf.d/tuning.cnf` to deploy custom MySQL configuration. However, when using the `mysql` cookbook's `mysql_service 'default'` resource, the configuration directory is instance-specific (`/etc/mysql-default/conf.d/`), not the standard system MySQL path. The template would have been placed in the wrong directory and never read by the MySQL instance. **Fix**: Replaced the `template` resource with the `mysql_config` resource provided by the `mysql` cookbook, which correctly places config files in the instance-specific directory. Removed the explicit `owner`, `group`, and `mode` properties (handled internally by `mysql_config`) and added the `instance 'default'` property to link it to the correct mysql_service instance.

## Review Notes
- The `database` cookbook (~> 6.0) is deprecated (last release 6.1.1 in 2016). The newer `mysql` cookbook versions (11.x) include `mysql_database` and `mysql_user` resources natively. However, since the post targets `mysql` cookbook ~> 8.0, the `database` cookbook is the correct companion for database/user management in that version range.
- The recipe loads encrypted data bag values using `data_bag_item` without passing a secret argument. This works correctly only if `encrypted_data_bag_secret` is configured in the node's `client.rb`. This is the standard setup but could be noted for completeness.
- Using `node.default` to set credentials from the data bag means the values could be overridden by higher-precedence attribute sources (roles, environments). Using `node.override` or local variables would be more robust, but `node.default` works for the common case presented.
