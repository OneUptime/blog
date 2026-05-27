# Validation Summary: How to Set Up Apigee Spike Arrest Policy to Handle Traffic Bursts

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Apigee
- Apigee SpikeArrest policy
- Apigee AssignMessage policy
- Apigee FaultRules
- Apigee Analytics Stats API
- XML policy configuration
- curl and gcloud authentication

## Sources Consulted
- Apigee SpikeArrest policy reference: https://docs.cloud.google.com/apigee/docs/api-platform/reference/policies/spike-arrest-policy
- Apigee comparing rate-limiting policies: https://docs.cloud.google.com/apigee/docs/api-platform/develop/comparing-quota-and-spike-arrest-policies
- Apigee AssignMessage policy reference: https://docs.cloud.google.com/apigee/docs/api-platform/reference/policies/assign-message-policy
- Apigee fault handling documentation: https://docs.cloud.google.com/apigee/docs/api-platform/fundamentals/fault-handling
- Apigee Stats API reference: https://docs.cloud.google.com/apigee/docs/reference/apis/apigee/rest/v1/organizations.environments.stats/get
- Apigee analytics metrics, dimensions, and filters reference: https://docs.cloud.google.com/apigee/docs/api-platform/analytics/analytics-reference
- Apigee metrics API usage guide: https://docs.cloud.google.com/apigee/docs/api-platform/analytics/use-analytics-api-measure-api-program-performance

## Issues Found
- The post described SpikeArrest as always smoothing traffic into evenly spaced requests. Current Apigee documentation recommends `<UseEffectiveCount>true</UseEffectiveCount>`, which uses the supported effective-count/sliding-window behavior and does not smooth requests into evenly spaced intervals. Updated the explanations and examples accordingly.
- The SpikeArrest XML examples omitted `<UseEffectiveCount>true</UseEffectiveCount>`. Added it to the policy examples to match current Apigee guidance for production use.
- Several XML examples placed an XML declaration after a path comment, which would make the copied XML invalid. Removed the declarations from snippets so the examples remain valid XML fragments.
- The dynamic rate example used nested `<Rate>` elements for the fallback value. Replaced it with the documented syntax: `<Rate ref="spike.arrest.rate">30ps</Rate>`.
- The AssignMessage error response included `<ReasonPhrase>`, which is not part of the documented AssignMessage `<Set>` syntax. Removed it and kept the supported status code, payload, and header configuration.
- The FaultRule snippet placed the outer `<Condition>` before the `<Step>`, while Apigee examples show steps followed by the FaultRule condition. Reordered the snippet to match documented FaultRules structure.
- The monitoring query filtered on `fault.name`, which is a flow/fault variable rather than a documented Analytics API dimension. Updated the query to use `sum(policy_error)` and the documented `ax_edge_execution_fault_code` dimension with the SpikeArrest fault code.
- The layered defense section described global SpikeArrest as DDoS-level protection. Reworded it to say it protects the proxy and backend from large traffic spikes.

## Review Notes
The tutorial is now aligned with current Apigee documentation. Future improvements could mention Apigee's documented rate-limit maximums and the caveat that SpikeArrest is not recommended for use cases requiring accurate counting across long windows.
