# Validation Summary: When to Stop, Hibernate, or Terminate Interrupted EC2 Spot Instances

## Status

validated

## Post Type

Guide

## Technologies Covered

- EC2 Spot market options
- EC2 hibernation
- Amazon EBS
- AWS CLI

## Sources Consulted

- [Spot interruption behavior](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/interruption-behavior.html)
- [SpotMarketOptions API](https://docs.aws.amazon.com/AWSEC2/latest/APIReference/API_SpotMarketOptions.html)
- [RunInstances CLI](https://docs.aws.amazon.com/cli/latest/reference/ec2/run-instances.html)
- [Hibernation prerequisites](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/hibernating-prerequisites.html)
- [Hibernation behavior](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/instance-hibernate-overview.html)
- [Interruption notices](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/spot-instance-termination-notices.html)
- [Managing Spot Instances](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/using-spot-instances-request.html)

## Issues Found

No technical issues found.

## Review Notes

- Verified RunInstances request-type restrictions, hibernation-option compatibility, encrypted-root requirements, and EC2-controlled restart after interruption.
- Confirmed the documented AWS notice-timing inconsistency and the distinction between cancellation of active running versus disabled stopped requests.
- Both market-option examples parsed as JSON and shell syntax checks passed. No capacity was launched and no hibernation, restart, or billing experiment was run.
