# Validation Summary: How to Configure HPA with Multiple Autoscaling Policies

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes HorizontalPodAutoscaler
- autoscaling/v2 HPA behavior configuration
- HPA scaling policies and selectPolicy
- kubectl
- jq

## Sources Consulted
- Kubernetes Horizontal Pod Autoscaling documentation: https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/
- Kubernetes autoscaling/v2 HorizontalPodAutoscaler API reference: https://kubernetes.io/docs/reference/kubernetes-api/autoscaling/horizontal-pod-autoscaler-v2/
- Kubernetes field selectors documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/

## Issues Found
- The post described using multiple HPA policies as both a scale-up floor and a scale-up cap at the same time. Kubernetes selects one policy for a scaling direction using selectPolicy, so selectPolicy: Max chooses the largest allowed change and cannot enforce an absolute cap when a percentage policy allows more. Updated the examples and explanations to distinguish floor-like behavior with Max from cap-like behavior with Min.
- The deployment-size example claimed that a 100-pod policy would cap a 50% policy at 250 replicas while using selectPolicy: Max. That was incorrect because 50% of 250 is 125, and Max selects 125. Updated the explanation.
- The metric-types section implied policies can be configured based on which metric triggers scaling. HPA evaluates metrics to compute desired replicas, but behavior policies are shared for the scaling direction and do not track which metric caused the recommendation. Updated the section wording.
- The time-based policy explanation implied progressively conservative phased behavior. HPA selects the policy that allows the largest change when selectPolicy is Max, subject to each policy's periodSeconds window. Updated the explanation to match that behavior.
- The monitoring command filtered events with grep "Scaled", which is less accurate for HPA rescale events. Updated it to use the supported Event field selector reason=SuccessfulRescale along with involvedObject.name.
- Best-practice text recommended an "absolute maximum" scale-up policy while still recommending Max selection. Updated the guidance to explain when fixed pod policies provide meaningful minimum changes and when selectPolicy: Min is needed for a hard cap.

## Review Notes
- YAML snippets were parsed successfully with PyYAML.
- kubectl was not installed in the review environment, so command validation was performed against Kubernetes documentation rather than local kubectl help output.
