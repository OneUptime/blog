# Validation Summary: How to Use OpenShift BuildConfigs

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenShift BuildConfigs
- OpenShift Source-to-Image (S2I) builds
- OpenShift Docker strategy builds
- OpenShift build triggers and webhooks
- OpenShift CLI (`oc start-build`)
- OpenShift ImageStreams

## Sources Consulted
- Red Hat OpenShift Container Platform 4.18, Builds using BuildConfig: https://docs.redhat.com/en/documentation/openshift_container_platform/4.18/html/builds_using_buildconfig/basic-build-operations
- Red Hat OpenShift Container Platform 4.18, BuildConfig API reference: https://docs.redhat.com/en/documentation/openshift_container_platform/4.18/html/workloads_apis/buildconfig-build-openshift-io-v1
- Red Hat OpenShift Container Platform 4.14, Builds using BuildConfig overview: https://docs.redhat.com/en/documentation/openshift_container_platform/4.14/html-single/builds_using_buildconfig/index
- Red Hat OpenShift Container Platform 4.14, Triggering and modifying builds: https://docs.redhat.com/en/documentation/openshift_container_platform/4.14/html/builds_using_buildconfig/triggering-builds-build-hooks
- Red Hat OpenShift Container Platform 4.16, Advanced build operations: https://docs.redhat.com/en/documentation/openshift_container_platform/4.16/html/builds_using_buildconfig/advanced-build-operations

## Issues Found
- The post description said BuildConfigs can "trigger pipelines." BuildConfigs trigger builds; OpenShift Pipelines are a separate Tekton-based system. Changed this to "trigger builds."
- The "What Is a BuildConfig" section listed "an image stream" as a source location. Current BuildConfig source types are more precise: Git, Binary, Dockerfile, and additional image inputs. Changed the wording to "Git, binary input, Dockerfile input, or additional image inputs."

## Review Notes
The YAML examples use the current `build.openshift.io/v1` BuildConfig API and valid `Source` and `Docker` strategy field names. The `oc start-build --follow` and `oc start-build --from-dir=. --follow` commands are consistent with the current OpenShift CLI documentation. The image stream tags used in the examples must exist in the relevant namespace, which the post already notes as a common pitfall.
