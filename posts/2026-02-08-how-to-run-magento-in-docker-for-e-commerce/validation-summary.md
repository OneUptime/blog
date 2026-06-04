# Validation Summary: How to Run Magento in Docker for E-Commerce

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker
- Docker Compose
- Magento Open Source / Adobe Commerce 2.4
- PHP-FPM
- MySQL
- Elasticsearch
- Redis
- Nginx
- Composer

## Sources Consulted
- Adobe Commerce system requirements: https://experienceleague.adobe.com/en/docs/commerce-operations/installation-guide/system-requirements
- Adobe Commerce search engine prerequisites: https://experienceleague.adobe.com/en/docs/commerce-operations/installation-guide/prerequisites/search-engine/overview
- Adobe Commerce command-line installation guide: https://experienceleague.adobe.com/en/docs/commerce-operations/installation-guide/tutorials/install
- Adobe Commerce Redis session storage guide: https://experienceleague.adobe.com/en/docs/commerce-operations/configuration-guide/cache/redis/redis-session
- Adobe Commerce Redis default and page cache guide: https://experienceleague.adobe.com/en/docs/commerce-operations/configuration-guide/cache/redis/redis-pg-cache
- Adobe Commerce Nginx installation guidance: https://experienceleague.adobe.com/en/docs/commerce-operations/installation-guide/prerequisites/web-server/nginx
- Docker Compose file reference: https://docs.docker.com/reference/compose-file/
- Docker Compose version top-level element reference: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Compose service dependencies reference: https://docs.docker.com/reference/compose-file/services/
- Docker Hub Magento Cloud Docker PHP tags: https://hub.docker.com/r/magento/magento-cloud-docker-php/tags
- Elastic Docker image registry for Elasticsearch 7.17.15: https://www.docker.elastic.co/r/elasticsearch/elasticsearch

## Issues Found
- The Docker Compose example used the obsolete top-level `version: "3.8"` field. Removed it to match the current Compose Specification.
- The Nginx image was pinned to `nginx:1.25-alpine`, while Adobe's current 2.4.7-p6 system requirements list Nginx 1.26. Updated it to `nginx:1.26-alpine`.
- The PHP-FPM image used `magento/magento-cloud-docker-php:8.2-fpm`, which is not the current tag format shown in Magento's Docker Hub tags. Updated it to `magento/magento-cloud-docker-php:8.2-fpm-1.4.8`.
- The Elasticsearch image referenced Docker Hub's `elasticsearch` namespace. Updated it to Elastic's official registry image, `docker.elastic.co/elasticsearch/elasticsearch:7.17.15`.
- The Redis image used the broad `redis:7-alpine` tag. Updated it to `redis:7.2-alpine`, matching Adobe's current 2.4.7-p6 Redis requirement.
- The Nginx static asset rules did not handle Magento's versioned static asset paths or fallback to `static.php` in developer mode. Added rewrite rules for versioned static URLs and missing static files.
- The Composer install command pinned Magento Open Source to the original `2.4.7` release. Updated it to `2.4.7-p6`, the current 2.4.7 patch release in Adobe's published support matrix.
- The installer command used `--base-url=http://localhost` without a trailing slash. Added the trailing slash required by Adobe's installer documentation.
- The installer command used an unquoted admin password containing `!`, which can fail in an interactive Bash shell. Quoted the password.
- The installer command omitted `--use-rewrites=1` even though the Nginx configuration is intended to support rewrites. Added the option to match Adobe's sample local installations.

## Review Notes
The guide remains technically focused on a Magento 2.4.7-p6-style local Docker stack. Adobe Commerce 2.4.8 and later no longer support Elasticsearch, so a future update should consider switching the guide to OpenSearch and a newer Magento/Open Source release. I did not run a full Magento installation because it requires Magento Marketplace credentials and pulls several large images; the review was performed against official documentation and image registry metadata.
