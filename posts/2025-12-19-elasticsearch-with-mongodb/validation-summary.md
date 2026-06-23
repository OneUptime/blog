# Validation Summary: How to Use Elasticsearch with MongoDB

## Status
validated

## Post Type
Tutorial / integration guide

## Technologies Covered
- MongoDB
- MongoDB change streams
- PyMongo
- Elasticsearch
- Elasticsearch Python client
- Logstash
- logstash-input-mongodb community plugin
- Monstache
- Docker Compose

## Sources Consulted
- MongoDB Manual: Change Streams - https://www.mongodb.com/docs/manual/changestreams/
- MongoDB PyMongo Driver: Monitor Data with Change Streams - https://www.mongodb.com/docs/languages/python/pymongo-driver/current/monitoring-and-logging/change-streams/
- Elastic Python client configuration: Ignoring status codes - https://www.elastic.co/docs/reference/elasticsearch/clients/python/configuration
- Elastic Python client API reference - https://elasticsearch-py.readthedocs.io/en/latest/api/elasticsearch.html
- Elastic Logstash Elasticsearch output plugin reference - https://www.elastic.co/docs/reference/logstash/plugins/plugins-outputs-elasticsearch
- Elastic Logstash plugin manager documentation - https://www.elastic.co/docs/reference/logstash/working-with-plugins
- logstash-input-mongodb project documentation - https://github.com/phutchins/logstash-input-mongodb
- Monstache configuration reference - https://rwynn.github.io/monstache-site/config/
- Docker Compose file reference: version top-level element - https://docs.docker.com/reference/compose-file/version-and-name/

## Issues Found
- The Python sync service used `es.delete(..., ignore=[404])`. Current Elasticsearch Python client documentation uses `client.options(ignore_status=404)` for ignoring expected HTTP statuses. Changed the delete call to `es.options(ignore_status=404).delete(...)`.
- The Logstash Elasticsearch output example used obsolete plugin options `ssl` and `ssl_certificate_verification`. Current plugin documentation lists these as obsolete in favor of `ssl_enabled` and `ssl_verification_mode`. Updated the example accordingly.
- The Docker Compose example included a top-level `version: '3.8'` key. Docker's current Compose specification marks this property as obsolete and only informative. Removed it from the snippet.

## Review Notes
The technical approach is valid: MongoDB change streams require a replica set or sharded cluster, PyMongo supports `full_document='updateLookup'`, Logstash plugins are installed with `bin/logstash-plugin install`, and the Monstache configuration keys shown are documented. The Logstash MongoDB input plugin is community-maintained, so its compatibility should be checked against the Logstash version used in a real deployment.
