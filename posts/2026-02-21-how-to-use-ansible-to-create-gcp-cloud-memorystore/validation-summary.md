# Validation Summary: How to Use Ansible to Create GCP Cloud Memorystore

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- google.cloud Ansible collection
- Google Cloud Memorystore for Redis
- Google Cloud CLI
- Redis
- Google Cloud VPC networking
- Cloud Monitoring

## Sources Consulted
- Ansible `google.cloud` collection documentation: https://docs.ansible.com/projects/ansible/latest/collections/google/cloud/index.html
- Ansible `google.cloud.gcp_redis_instance` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/google/cloud/gcp_redis_instance_module.html
- Google Cloud Memorystore for Redis REST API `Instance` reference: https://cloud.google.com/memorystore/docs/redis/reference/rest/v1/projects.locations.instances
- Google Cloud Memorystore for Redis supported versions: https://cloud.google.com/memorystore/docs/redis/supported-versions
- Google Cloud Memorystore for Redis networking documentation: https://cloud.google.com/memorystore/docs/redis/networking
- Google Cloud Memorystore for Redis high availability documentation: https://cloud.google.com/memorystore/docs/redis/high-availability-for-memorystore-for-redis
- Google Cloud Memorystore for Redis supported Redis configurations: https://cloud.google.com/memorystore/docs/redis/supported-redis-configurations
- Google Cloud Memorystore for Redis tier capabilities and pricing guidance: https://cloud.google.com/memorystore/docs/redis/redis-tiers and https://cloud.google.com/memorystore/docs/redis/pricing
- Google Cloud SDK `gcloud services enable` reference: https://cloud.google.com/sdk/gcloud/reference/services/enable

## Issues Found
- The post said Memorystore supports only Redis and Memcached. Google Cloud Memorystore now includes Redis, Redis Cluster, Memcached, and Valkey offerings, so the introduction was updated.
- The prerequisites said Ansible 2.10 or newer. The current official `google.cloud` collection documentation lists ansible-core 2.16 or newer as supported, so the prerequisite was corrected.
- The connectivity section said Memorystore instances are only accessible from within the same VPC network. Google Cloud documents internal IP access through the authorized VPC network, including supported private networking paths such as on-premises access with private services access, so the wording was corrected.
- One playbook description claimed to configure a Compute Engine VM, but the tasks only write Redis connection details to a local config file. The surrounding text and code comment were updated to match what the playbook actually does.
- The production tip said to size only by data and not traffic, and claimed a 1GB instance can handle tens of thousands of operations per second. Google Cloud pricing is based on provisioned capacity, but capacity tier also affects achievable performance, so the advice was narrowed to data and throughput needs.

## Review Notes
The `google.cloud.gcp_redis_instance` examples use valid current module parameters such as `name`, `region`, `memory_size_gb`, `tier`, `redis_version`, `authorized_network`, `redis_configs`, `labels`, and authentication fields. `REDIS_7_0`, `BASIC`, and `STANDARD_HA` remain valid values. The `gcloud services enable redis.googleapis.com --project=my-project-id` command uses valid `gcloud` syntax.
