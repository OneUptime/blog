# Validation Summary: How to Configure Log Retention Policies with Flux CD

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Flux CD Kustomization
- Kubernetes Jobs and ConfigMaps
- Elasticsearch Index Lifecycle Management (ILM)
- OpenSearch Index State Management (ISM)
- Elasticsearch and OpenSearch index templates and rollover aliases
- `kubectl`, `curl`, and `jq`

## Sources Consulted
- Elasticsearch ILM rollover action: https://www.elastic.co/docs/reference/elasticsearch/index-lifecycle-actions/ilm-rollover
- Elasticsearch lifecycle policy setup and rollover alias requirements: https://www.elastic.co/docs/manage-data/lifecycle/index-lifecycle-management/configure-lifecycle-policy
- Elasticsearch ILM settings, including `indices.lifecycle.poll_interval`: https://www.elastic.co/docs/reference/elasticsearch/configuration-reference/index-lifecycle-management-settings
- Elasticsearch 8 migration notes for the ILM `freeze` action: https://elastic.aiops.work/guide/en/elasticsearch/reference/8.19/migrating-8.0.html
- OpenSearch ISM policies and rollover action: https://docs.opensearch.org/latest/im-plugin/ism/policies/
- Flux Kustomization documentation for `sourceRef`, `prune`, `interval`, `dependsOn`, `wait`, and force replacement: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Kubernetes TTL-after-finished Jobs: https://kubernetes.io/docs/concepts/workloads/controllers/ttlafterfinished/

## Issues Found
- The introduction incorrectly said Elasticsearch and OpenSearch both provide ILM. OpenSearch uses ISM, so the wording now distinguishes Elasticsearch ILM from OpenSearch ISM.
- The Elasticsearch audit policy used the ILM `freeze` action. In Elasticsearch 8.x this action is a no-op because the freeze API was removed, so the cold phase containing `freeze` was removed.
- The Job example used Helm template syntax for a checksum annotation inside a Flux/Kustomize workflow. Flux Kustomizations do not render Helm template functions in plain YAML, so the example now uses Flux force replacement plus a pod template annotation that can be changed when policies change.
- The Flux Kustomization did not wait for the Job to complete. The example now includes `wait: true`, matching Flux's documented pattern for Job-style pre/post deployment work.
- The OpenSearch ISM example used `ism_template` as an array. Current OpenSearch documentation shows `ism_template` as an object with `index_patterns` and `priority`, so the snippet was corrected.
- The best-practices section recommended comments inside policy JSON. JSON does not support comments, so the guidance now recommends adjacent YAML comments or policy description fields.

## Review Notes
The Elasticsearch rollover alias examples are correct, but a production setup must still create the initial write index or use data streams. The post mentions rollover aliases, and the corrected examples are valid for alias-based rollover, but the initial index bootstrap step could be expanded in a future revision.
