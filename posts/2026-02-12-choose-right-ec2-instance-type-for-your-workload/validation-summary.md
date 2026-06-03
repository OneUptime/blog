# Validation Summary: How to Choose the Right EC2 Instance Type for Your Workload

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Amazon EC2 instance types
- EC2 instance families: T, M, C, R, X, I, D, H, P, G, Inf, Trn
- AWS Graviton, Intel, and AMD EC2 processors
- AWS Compute Optimizer
- Amazon CloudWatch metrics
- EC2 On-Demand, Savings Plans, Reserved Instances, and Spot Instances

## Sources Consulted
- Amazon EC2 instance type naming conventions: https://docs.aws.amazon.com/ec2/latest/instancetypes/instance-type-names.html
- Amazon EC2 general purpose instance specifications: https://docs.aws.amazon.com/ec2/latest/instancetypes/gp.html
- Amazon EC2 instance lifecycle and stopped instance behavior: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-instance-lifecycle.html
- Amazon EC2 burstable performance unlimited mode: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/burstable-performance-instances-unlimited-mode.html
- AWS Compute Optimizer metrics analyzed: https://docs.aws.amazon.com/compute-optimizer/latest/ug/metrics.html
- AWS Compute Optimizer EC2 recommendations: https://docs.aws.amazon.com/compute-optimizer/latest/ug/view-ec2-recommendations.html
- Amazon EC2 billing and purchasing options: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/instance-purchasing-options.html
- Amazon EC2 storage optimized instance specifications: https://docs.aws.amazon.com/ec2/latest/instancetypes/so.html
- Amazon EC2 accelerated computing instance specifications: https://docs.aws.amazon.com/ec2/latest/instancetypes/ac.html
- Amazon EC2 Spot Instance interruption notices: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/spot-instance-termination-notices.html

## Issues Found
- The M7g sizing table listed only "up to" network bandwidth and gave 4xlarge as "up to 25 Gbps." AWS documents smaller M7g sizes with baseline/burst network values, and m7g.4xlarge is 7.5 Gbps baseline / up to 15 Gbps. Updated the table with the official baseline and burst values for medium through 4xlarge.
- The statement that each step up "roughly doubles everything" was too broad because network and EBS bandwidth do not always scale linearly. Updated it to say vCPU and memory roughly double, while network and EBS bandwidth usually increase but not always linearly.
- The post said Compute Optimizer works "after running for a few days." AWS documents a default 14-day lookback period after opt-in. Updated the wording to match that behavior.
- The post said changing instance type does not lose data. That is only safe for EBS-backed data; stopping an EC2 instance loses data on attached instance store volumes. Added the instance-store caveat.
- The post said AWS offers "most instance types" with three processor options. This overgeneralized EC2 availability. Updated it to say many current instance families have multiple processor options.
- The Spot Instance warning wording did not mention the hibernation exception. Updated it to say EC2 gives a two-minute warning before stop or termination, except when hibernation starts immediately.

## Review Notes
The post is a conceptual EC2 selection guide with no executable code, commands, or configuration snippets. The remaining guidance is broadly correct but intentionally simplified; exact pricing, regional availability, and instance family recommendations should be rechecked periodically because AWS launches new EC2 generations and changes availability over time.
