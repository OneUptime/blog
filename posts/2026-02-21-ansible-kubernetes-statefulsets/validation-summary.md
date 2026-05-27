# Validation Summary: How to Use Ansible to Manage Kubernetes StatefulSets

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- Ansible `kubernetes.core` collection
- Kubernetes StatefulSets
- Kubernetes Services, Secrets, Namespaces, and PersistentVolumeClaims
- PostgreSQL containers
- Apache Kafka / Confluent Platform containers

## Sources Consulted
- Kubernetes StatefulSet documentation: https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes Secret documentation: https://kubernetes.io/docs/concepts/configuration/secret/
- Ansible `kubernetes.core.k8s` module documentation: https://docs.ansible.com/ansible/latest/collections/kubernetes/core/k8s_module.html
- Ansible `kubernetes.core.k8s_info` module documentation: https://docs.ansible.com/ansible/latest/collections/kubernetes/core/k8s_info_module.html
- Ansible `kubernetes.core` collection requirements: https://docs.ansible.com/ansible/latest/collections/kubernetes/core/
- Confluent Docker configuration documentation: https://docs.confluent.io/platform/current/installation/docker/config-reference.html
- Confluent KRaft configuration documentation: https://docs.confluent.io/platform/current/kafka-metadata/config-kraft.html

## Issues Found
- The prerequisites listed Ansible 2.12+, but the current `kubernetes.core` collection documentation requires a newer Ansible Core release. Updated this to Ansible Core 2.16+.
- The stable pod-name example used `podname-0`, which could imply an arbitrary pod prefix. Updated it to show that StatefulSet pods are named from the StatefulSet name and ordinal.
- The PostgreSQL StatefulSet referenced a `postgres-credentials` Secret that the playbook never created. Added a narrowly scoped Secret task and variables so the example is complete.
- The PostgreSQL wording called the three pods "replicas", which could imply database replication. Changed this to "instances" or "pods" because the manifest creates separate PostgreSQL pods but does not configure PostgreSQL streaming replication.
- The PostgreSQL probes hardcoded `postgres` as the user while the manifest sourced `POSTGRES_USER` from a Secret. Updated the probes to use the same Ansible variable.
- The Kafka playbook used the `messaging` namespace without creating it. Added a namespace task.
- The Kafka example exposed a controller service port but did not expose the matching container port or configure the Confluent Kafka container with the required KRaft settings. Added KRaft-related environment variables, stable advertised listeners, a unique node ID derived from the StatefulSet ordinal, and the missing controller container port.
- The Kafka explanation mentioned ZooKeeper or KRaft even though the corrected example uses KRaft. Updated the explanation to match the manifest.

## Review Notes
The examples are suitable as tutorial manifests, but the PostgreSQL example still demonstrates StatefulSet storage and identity rather than a production PostgreSQL high-availability topology. In production, database clustering, backups, credentials management, and application-specific scale-down procedures need additional design beyond the StatefulSet object itself.
