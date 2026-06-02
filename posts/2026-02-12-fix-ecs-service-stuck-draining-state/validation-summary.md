# Validation Summary: How to Fix ECS Service Stuck in 'Draining' State

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Amazon ECS
- ECS container instance draining
- Elastic Load Balancing target groups
- Application Load Balancer
- Network Load Balancer
- AWS CLI
- Python signal handling
- Node.js SIGTERM handling

## Sources Consulted
- Amazon ECS Developer Guide: Draining Amazon ECS container instances: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/container-instance-draining.html
- Amazon ECS Developer Guide: Optimize load balancer connection draining parameters for Amazon ECS: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/load-balancer-connection-draining.html
- Amazon ECS Developer Guide: Amazon ECS task definition parameters, `stopTimeout`: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task_definition_parameters.html
- Elastic Load Balancing User Guide: Edit target group attributes for Application Load Balancers: https://docs.aws.amazon.com/elasticloadbalancing/latest/application/edit-target-group-attributes.html
- Elastic Load Balancing User Guide: Edit target group attributes for Network Load Balancers: https://docs.aws.amazon.com/elasticloadbalancing/latest/network/edit-target-group-attributes.html
- AWS CLI Command Reference: `modify-target-group-attributes`: https://docs.aws.amazon.com/cli/latest/reference/elbv2/modify-target-group-attributes.html
- AWS CLI Command Reference: `update-container-instances-state`: https://docs.aws.amazon.com/cli/latest/reference/ecs/update-container-instances-state.html
- AWS CLI Command Reference: `describe-container-instances`: https://docs.aws.amazon.com/cli/latest/reference/ecs/describe-container-instances.html
- AWS CLI Command Reference: `describe-auto-scaling-groups`: https://docs.aws.amazon.com/cli/latest/reference/autoscaling/describe-auto-scaling-groups.html

## Issues Found
- The load balancer sequence diagram used `ALB` even though the article later discussed connection termination behavior that is documented for Network Load Balancer target groups. Changed the diagram participant to generic `LB`.
- The long-running connections section implied `deregistration_delay.connection_termination.enabled` was generally available for the load balancer flow described by the article. Scoped that command to Network Load Balancer target groups and clarified that Application Load Balancer target groups support deregistration delay but not that connection termination attribute.
- The article said ECS always sends SIGTERM. AWS documents that ECS sends the container stop signal, which defaults to SIGTERM and can be changed with the Dockerfile `STOPSIGNAL` instruction. Updated the wording.
- The Python signal-handling snippet called an undefined `cleanup()` function. Added a small placeholder function so the example is complete.

## Review Notes
The AWS CLI commands and ECS deployment configuration fields reviewed are current and valid. The `minimumHealthyPercent` explanation is accurate for ECS services during container instance draining, and the `stopTimeout` default of 30 seconds is consistent with current ECS documentation.
