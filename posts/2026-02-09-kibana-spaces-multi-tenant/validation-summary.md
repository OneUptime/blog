# Validation Summary: How to Configure Kibana Spaces for Multi-Tenant Log Isolation

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kibana Spaces
- Kibana data views
- Kibana role and spaces APIs
- Elasticsearch security roles and users
- Kibana saved objects import, export, and copy APIs
- Kibana audit logging

## Sources Consulted
- Elastic Kibana Spaces documentation: https://www.elastic.co/docs/deploy-manage/manage-spaces
- Kibana Spaces API documentation: https://www.elastic.co/docs/api/doc/kibana/operation/operation-post-spaces-space
- Kibana data views API documentation: https://www.elastic.co/docs/api/doc/kibana/v8/operation/operation-createdataviewdefaultw
- Kibana privileges documentation: https://www.elastic.co/docs/deploy-manage/users-roles/cluster-or-deployment-auth/kibana-privileges
- Kibana role API documentation: https://www.elastic.co/docs/api/doc/kibana/operation/operation-put-security-role-name
- Elasticsearch create or update users API documentation: https://www.elastic.co/guide/en/elasticsearch/reference/current/security-api-put-user.html
- Kibana copy saved objects between spaces API documentation: https://www.elastic.co/docs/api/doc/kibana/operation/operation-post-spaces-copy-saved-objects
- Kibana saved objects export/import API documentation: https://www.elastic.co/docs/api/doc/kibana/operation/operation-post-saved-objects-export and https://www.elastic.co/docs/api/doc/kibana/operation/operation-post-saved-objects-import
- Kibana advanced settings documentation: https://www.elastic.co/docs/reference/kibana/advanced-settings
- Kibana audit events documentation: https://www.elastic.co/docs/reference/kibana/kibana-audit-events

## Issues Found
- The post used the legacy "index pattern" terminology and the deprecated saved object creation route for creating index patterns. Updated the examples to use Kibana data views and `POST /api/data_views/data_view`, including space-aware paths.
- The role examples used raw Elasticsearch application privilege entries for Kibana spaces. Replaced them with Kibana's documented role API, which defines Elasticsearch index privileges and Kibana space privileges in one role payload.
- The post claimed users automatically land in their assigned space. Updated this to state that users can access only spaces granted by their roles, and that users with multiple spaces can choose or switch spaces.
- The bulk tenant script used the legacy data view creation route and raw application privileges. Updated it to use the current data views API and Kibana role API.
- The monitoring section used the deprecated saved objects `_find` endpoint to count dashboards and described a role lookup as listing users. Updated the dashboard example to use the dashboards API and the user lookup to use Elasticsearch's user query API.
- The audit example searched `.security-audit-*` for Kibana space events. Updated it to describe searching ingested Kibana audit logs and retained the documented `event.action: space_create` field.
- The default space section used an internal Kibana endpoint. Replaced it with the documented space-level `defaultRoute` advanced setting workflow.

## Review Notes
The saved objects export example still includes `index-pattern` as a saved object type because Elastic's saved objects export documentation continues to list `index-pattern` as the underlying type for exported data view objects. The post does not pin an Elastic Stack version, so the review targeted current Elastic documentation available on 2026-06-04.
