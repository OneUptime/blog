# Validation Summary: How to Configure Kafka Users with Strimzi CRDs via Flux CD

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Strimzi
- Apache Kafka
- KafkaUser custom resources
- Kafka ACLs
- Kubernetes Secrets and Deployments
- Flux CD Kustomizations
- GitOps

## Sources Consulted
- Strimzi latest Deploying and Managing documentation: https://strimzi.io/docs/operators/latest/deploying
- Strimzi latest Custom Resource API reference: https://strimzi.io/docs/operators/latest/full/configuring
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux Kustomize API reference v1: https://fluxcd.io/flux/components/kustomize/api/v1/
- Kubernetes Secrets documentation: https://kubernetes.io/docs/concepts/configuration/secret/
- Apache Kafka SSL documentation: https://kafka.apache.org/39/security/encryption-and-authentication-using-ssl/

## Issues Found
- The KafkaUser examples used `apiVersion: kafka.strimzi.io/v1beta2`, while the current Strimzi documentation uses `kafka.strimzi.io/v1`. Updated the KafkaUser manifests to `v1`.
- The post stated that Strimzi supports only two KafkaUser authentication types. Updated the explanation to include `tls-external`, while clarifying that the guide focuses on TLS and SCRAM-SHA-512 because the User Operator generates credentials for those modes.
- The TLS user Secret description incorrectly listed `ca.crt` as broker verification material in the user Secret. Updated the post to explain that user credentials are in the KafkaUser Secret and broker trust material comes from the cluster CA Secret, such as `production-cluster-ca-cert`.
- The SCRAM Secret key was listed as `saslJaasConfig`. Updated it to the documented `sasl.jaas.config` key.
- The application Deployment example mounted a KafkaUser Secret from a different namespace and used `ca.crt` as a Java truststore path. Updated the example to run in the same namespace, mount both the user Secret and cluster CA Secret, and use PKCS12 keystore/truststore settings.
- The Deployment snippet was missing required selector/template labels and a container image. Added those fields so the manifest is structurally valid.
- The TLS connectivity command referenced an undefined `/tmp/client.properties` file. Replaced it with explicit Kafka producer SSL properties using the mounted PKCS12 user and cluster CA Secrets.
- The best-practice wording described TLS as categorically stronger than SCRAM. Reworded it to recommend TLS for services that can handle client certificates without making an overbroad comparison.
- The TLS rotation best practice recommended deleting and recreating the KafkaUser. Updated it to use the documented `strimzi.io/force-renew: "true"` annotation on the generated user Secret.

## Review Notes
The Flux Kustomization fields shown in the post are current for `kustomize.toolkit.fluxcd.io/v1`. The connectivity test assumes the target pod image includes Kafka CLI tools; in a real deployment, teams may prefer a purpose-built temporary Kafka client pod.
