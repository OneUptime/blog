# Validation Summary: How to Implement OpenShift Pipelines

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Red Hat OpenShift Pipelines
- Tekton Pipelines
- Tekton Triggers
- Kubernetes custom resources
- OpenShift Routes
- PersistentVolumeClaims and workspaces
- Tekton CLI (`tkn`)
- Prometheus Operator `ServiceMonitor` and `PrometheusRule`

## Sources Consulted
- Red Hat OpenShift Pipelines 1.20 release notes: https://docs.redhat.com/en/documentation/red_hat_openshift_pipelines/1.20/html-single/release_notes/index
- Red Hat OpenShift Pipelines 1.19 release notes: https://docs.redhat.com/en/documentation/red_hat_openshift_pipelines/1.19/html-single/release_notes/index
- Red Hat OpenShift Pipelines installation documentation: https://docs.redhat.com/en/documentation/red_hat_openshift_pipelines/1.14/html/installing_and_configuring/installing-pipelines
- Red Hat OpenShift Pipelines resolver documentation: https://docs.redhat.com/en/documentation/red_hat_openshift_pipelines/1.16/html/creating_cicd_pipelines/remote-pipelines-tasks-resolvers
- Tekton Pipelines deprecations: https://tekton.dev/docs/pipelines/deprecations/
- Tekton cluster resolver documentation: https://tekton.dev/docs/pipelines/cluster-resolver/
- Tekton PipelineRun documentation: https://tekton.dev/docs/pipelines/pipelineruns/
- Tekton Pipeline metrics documentation: https://tekton.dev/docs/pipelines/metrics/
- Tekton Triggers API documentation: https://tekton.dev/docs/triggers/triggers-api/
- OpenShift Pipelines CLI (`tkn`) command reference: https://docs.redhat.com/en/documentation/openshift_container_platform/4.9/html/cli_tools/pipelines-cli-tkn

## Issues Found
- The post used `tekton.dev/v1beta1` for Tekton `Task`, `Pipeline`, and `PipelineRun` examples. Updated those examples to `tekton.dev/v1` because Tekton documents the v1beta1 Pipeline APIs as deprecated in favor of v1.
- The post described and used `ClusterTask` as the preferred shared-task mechanism. Replaced ClusterTask usage with the cluster resolver and namespaced shared `Task` examples, because OpenShift Pipelines 1.19 removed support for `ClusterTask` objects and current OpenShift documentation directs users to tasks in the `openshift-pipelines` namespace via the cluster resolver.
- The installation verification command waited for pods using a brittle operator pod label. Replaced it with a wait on `tektonconfig/config`, matching Red Hat's documented verification path.
- The PipelineRun trigger template used the deprecated `timeout` field. Replaced it with `timeouts.pipeline`.
- The metrics section used deprecated metric names such as `tekton_pipelines_controller_pipelinerun_count` and `tekton_pipelines_controller_running_pipelineruns_count`. Updated them to the current `_total` and non-`_count` names and adjusted the duration alert for histogram output.
- The ServiceMonitor example selected an outdated label and port name. Updated it to select the Tekton controller service labels and `http-metrics` port.
- The Linux `tkn` install example pinned `v0.33.0`, which is older than the OpenShift Pipelines 1.20 supported CLI line. Updated it to a 0.42.x release.
- The scalability description incorrectly said each PipelineRun is an isolated pod. Updated it to say each TaskRun executes in its own isolated pod.

## Review Notes
- The Trigger resources remain on `triggers.tekton.dev/v1beta1`, which is still the documented Tekton Triggers API.
- YAML code blocks in the post were parsed successfully after the edits.
