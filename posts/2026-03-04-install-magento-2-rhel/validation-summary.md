# Validation Summary: How to Install Magento 2 on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- RHEL 9
- Magento Open Source 2.4.7-p10
- PHP 8.2 and PHP-FPM
- Nginx
- MariaDB 10.11
- OpenSearch 2.x
- Composer

## Sources Consulted
- Adobe Commerce system requirements: https://experienceleague.adobe.com/en/docs/commerce-operations/installation-guide/system-requirements
- Adobe Commerce command-line installation guide: https://experienceleague.adobe.com/en/docs/commerce-operations/installation-guide/tutorials/install
- Adobe Commerce Composer installation quick start: https://experienceleague.adobe.com/en/docs/commerce-operations/installation-guide/composer
- Adobe Commerce search engine prerequisites: https://experienceleague.adobe.com/en/docs/commerce-operations/installation-guide/prerequisites/search-engine/overview
- Adobe Commerce Nginx configuration guidance: https://experienceleague.adobe.com/en/docs/commerce-operations/configuration-guide/multi-sites/ms-nginx
- Red Hat RHEL 9 PHP documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/installing_and_using_dynamic_programming_languages
- Red Hat RHEL 9 database server documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/configuring_and_using_database_servers/index
- OpenSearch RPM installation documentation: https://docs.opensearch.org/latest/install-and-configure/install-opensearch/rpm/
- OpenSearch security plugin documentation: https://docs.opensearch.org/latest/security/configuration/disable-enable-security/

## Issues Found
- The original tutorial installed an unpinned Magento package while requiring PHP 8.2. Current Magento Open Source releases have different PHP requirements, so the Composer command was pinned to `magento/project-community-edition=2.4.7-p10`, which Adobe lists as compatible with PHP 8.2.
- The original tutorial used MySQL. Adobe's current on-premises requirements for the selected Magento version list MariaDB 10.11/11.8 and mark MySQL as unsupported for the latest 2.4.7 patch, so the database steps were changed to MariaDB 10.11.
- The original tutorial used Elasticsearch 7, which reached end of support on January 15, 2026 and is not the recommended current path for this stack. The search engine steps were changed to OpenSearch 2.x.
- The PHP install used Remi's RHEL 9 repository even though RHEL 9 provides a supported PHP 8.2 module stream. The commands were changed to use the RHEL `php:8.2` module.
- The `find ... chmod` permission commands lacked `sudo` even though the tree had just been chowned to the `nginx` user. Added `sudo` so the commands can run as written.
- The Magento install command used Elasticsearch flags. Updated it to OpenSearch flags and added `--use-rewrites=1`, matching Adobe's current installation examples.
- Metadata still referenced MySQL and Elasticsearch after the stack change. Updated the description and tags to MariaDB and OpenSearch.

## Review Notes
The post disables OpenSearch security for a local single-node tutorial setup so Magento can connect over HTTP on `localhost:9200`. A production deployment should keep OpenSearch protected with TLS/authentication and should also add HTTPS, SELinux, firewall, backup, cron, and queue configuration details.
