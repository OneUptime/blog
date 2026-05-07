# Validation Summary: How to Run Kibana in a Podman Container

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Podman
- Podman pods and port publishing
- Kibana 8.12.0
- Elasticsearch 8.12.0
- Elastic Stack container images
- Kibana configuration with environment variables and kibana.yml
- Elasticsearch indexing APIs

## Sources Consulted
- Elastic Docs: Install Kibana with Docker, https://www.elastic.co/docs/deploy-manage/deploy/self-managed/install-kibana-with-docker
- Elastic Docs: Install Elasticsearch with Docker, https://www.elastic.co/docs/deploy-manage/deploy/self-managed/install-elasticsearch-with-docker
- Elastic Docs: Kibana configuration reference, https://www.elastic.co/docs/reference/kibana/configuration-reference
- Elastic Docs: Telemetry settings in Kibana, https://www.elastic.co/docs/reference/kibana/configuration-reference/telemetry-settings
- Elastic Docs: Elasticsearch security settings, https://www.elastic.co/docs/reference/elasticsearch/configuration-reference/security-settings
- Elastic Docs: Automatic security setup, https://www.elastic.co/docs/deploy-manage/security/self-auto-setup
- Podman Docs: podman-pod-create, https://docs.podman.io/en/stable/markdown/podman-pod-create.1.html
- Podman Docs: podman-run, https://docs.podman.io/en/v5.4.1/markdown/podman-run.1.html
- Podman Docs: volume mount options, https://docs.podman.io/en/v4.3/markdown/options/volume.html

## Issues Found
- The post pulled and ran short or Docker Hub image names for Kibana and Elasticsearch. Elastic's official Docker installation docs use the Elastic registry, so the examples now use `docker.elastic.co/kibana/kibana:8.12.0` and `docker.elastic.co/elasticsearch/elasticsearch:8.12.0`.
- The Kibana `ELASTICSEARCH_HOSTS` environment variable was shown as a plain string. Elastic's Docker docs show array settings using JSON array syntax, so the Podman examples now use `ELASTICSEARCH_HOSTS=["http://..."]`.
- The standalone section said it used the host network, but the command used Podman's `host.containers.internal` host gateway name with normal port publishing. The wording now describes that accurately.
- The custom Kibana example attempted to start a second Kibana container in the same pod on port 5601 while the earlier `elk-kibana` container would still be running. The example now removes `elk-kibana` before starting `kibana-custom`.
- The management commands referred to `elk-kibana` after the custom configuration flow replaced it. They now use `kibana-custom`.
- The rootless-container claims implied Podman was always running rootless. The wording now states that rootless mode is an option and describes its isolation benefit without implying the command automatically enforces it.

## Review Notes
The tutorial disables Elasticsearch security for a local development setup, which is technically valid but not suitable for production. Kibana and Elasticsearch versions should continue to match when readers update the examples to a newer Elastic Stack release.
