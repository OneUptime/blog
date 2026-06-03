# Validation Summary: How to Use CloudFormation Fn::Select and Fn::Split Functions

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS CloudFormation
- CloudFormation intrinsic functions: Fn::Select, Fn::Split, Fn::GetAZs, Fn::Cidr, Fn::If, Fn::ImportValue
- YAML CloudFormation templates
- AWS EC2, VPC, subnet, S3 ARN, IAM ARN, and Elastic Load Balancing examples

## Sources Consulted
- AWS CloudFormation Fn::Select documentation: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/intrinsic-function-reference-select.html
- AWS CloudFormation Fn::Split documentation: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/intrinsic-function-reference-split.html
- AWS CloudFormation Fn::GetAZs documentation: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/intrinsic-function-reference-getavailabilityzones.html
- AWS CloudFormation Fn::Cidr documentation: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/intrinsic-function-reference-cidr.html
- AWS CloudFormation condition functions documentation: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/intrinsic-function-reference-conditions.html
- AWS CloudFormation parameters syntax documentation: https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/parameters-section-structure.html

## Issues Found
- The post said `!GetAZs ''` returns all Availability Zones in the current region. AWS documents a more specific behavior: it returns only Availability Zones that have a default subnet unless none of the Availability Zones have a default subnet, in which case all Availability Zones are returned. Updated the explanation and the related out-of-bounds warning to refer to the returned list rather than the region's total AZ count.
- The conditional selection example used `Fn::If` as the `Fn::Select` index. AWS documents that the `Fn::Select` index value supports only `Ref` and `Fn::FindInMap`, while `Fn::If` is supported in the list-of-objects argument and as a property value. Updated the example to put `Fn::Select` calls inside the branches of `Fn::If`.

## Review Notes
The remaining examples and explanations match AWS's current documentation for `Fn::Select`, `Fn::Split`, `Fn::Cidr`, `Fn::ImportValue`, `CommaDelimitedList` parameters, empty split results, and out-of-bounds selection behavior. Several snippets are illustrative and omit surrounding resources such as VPC declarations or parameter definitions, which is acceptable for the tutorial format but would need completion before direct deployment.
