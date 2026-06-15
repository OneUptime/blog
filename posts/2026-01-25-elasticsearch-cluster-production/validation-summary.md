# Validation Summary: How to Set Up an Elasticsearch Cluster for Production

## Status
validated

## Post Type
Tutorial / production deployment guide

## Technologies Covered
- Elasticsearch 8.x
- Elasticsearch cluster discovery and node roles
- Elasticsearch transport and HTTP TLS
- JVM heap sizing
- Linux system limits and swap configuration
- Elasticsearch composable index templates
- systemd
- curl and basic cluster verification commands

## Sources Consulted
- Elastic Elasticsearch 8.19 Debian package installation docs: https://www.elastic.co/guide/en/elasticsearch/reference/8.19/deb.html
- Elastic Elasticsearch node settings and node roles docs: https://www.elastic.co/guide/en/elasticsearch/reference/8.19/modules-node.html
- Elastic Elasticsearch discovery and cluster formation settings docs: https://www.elastic.co/guide/en/elasticsearch/reference/8.19/modules-discovery-settings.html
- Elastic bootstrap checks docs: https://www.elastic.co/docs/deploy-manage/deploy/self-managed/bootstrap-checks
- Elastic transport TLS setup docs: https://www.elastic.co/docs/deploy-manage/security/set-up-basic-security
- Elastic HTTPS setup docs: https://www.elastic.co/docs/deploy-manage/security/set-up-basic-security-plus-https
- Elastic JVM settings docs: https://www.elastic.co/docs/reference/elasticsearch/jvm-settings
- Elastic path settings docs: https://www.elastic.co/docs/reference/elasticsearch/configuration-reference/path
- Elastic index templates docs: https://www.elastic.co/docs/manage-data/data-store/templates
- Elastic legacy index template API docs: https://www.elastic.co/guide/en/elasticsearch/reference/8.19/indices-templates-v1.html
- Elastic disable swapping docs: https://www.elastic.co/guide/en/elasticsearch/reference/8.19/setup-configuration-memory.html

## Issues Found
- The topology diagram implied that coordinating nodes send requests through master nodes and that master nodes proxy to data nodes. Updated the diagram and added a note clarifying that all nodes communicate over the transport layer and that arrows show the typical client/query path.
- The master-node configuration included `discovery.zen.minimum_master_nodes`, which is obsolete in Elasticsearch 8.x. Removed it and clarified that `cluster.initial_master_nodes` must be removed after the cluster forms.
- The data-node configuration recommended multiple `path.data` entries for striping across disks. Multiple data paths are deprecated, and Elastic recommends RAID/LVM, separate nodes, or adding nodes instead. Changed the example to a single data path with a RAID/LVM note.
- The examples used HTTPS curl commands and the checklist required HTTP TLS, but the node configurations only enabled transport TLS. Added `xpack.security.http.ssl.enabled` and an HTTP keystore path to the node examples.
- The JVM guidance said to never exceed 31GB. Elastic's current guidance recommends automatic heap sizing for most production deployments and keeping manual heap overrides under the compressed ordinary object pointer threshold, where 26GB is safe on most systems and the threshold can be as high as 30GB. Updated the wording.
- The swap command was described as fully disabling swap, but `swapoff -a` is temporary unless swap entries are removed from `/etc/fstab`. Updated the comment to distinguish temporary and permanent configuration.
- The certificate section only mentioned inter-node TLS. Updated it to include HTTP TLS and added a note to generate certificates with the correct DNS names and IP addresses for clients that validate hostnames.
- The index template example used the deprecated legacy `_template` API. Replaced it with the composable `_index_template` API and updated the request body to use `priority` and nested `template.settings`.

## Review Notes
The post is technically relevant and salvageable as a production-oriented Elasticsearch guide. Future improvements could add a short note about enrollment-token based node joining in Elasticsearch 8.x package installs and avoiding broad `index_patterns: ["*"]` templates in real clusters because they can collide with built-in templates.
