# Validation Summary: How to Configure Resource Constraints in Pacemaker on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Pacemaker
- pcs command-line tool
- High availability cluster resource constraints

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Configuring location constraints - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/configuring_and_managing_high_availability_clusters/index
- Red Hat Enterprise Linux 9 documentation: Determining resource location with rules - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_managing_high_availability_clusters/assembly_determining-resource-location-with-rules-configuring-and-managing-high-availability-clusters
- Red Hat Enterprise Linux 9 documentation: Determining the order in which cluster resources are run - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_managing_high_availability_clusters/assembly_determining-resource-order.adoc-configuring-and-managing-high-availability-clusters
- Red Hat Enterprise Linux 9 documentation: Displaying resource constraints and dependencies - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_managing_high_availability_clusters/proc_displaying-resource-constraints.adoc-configuring-and-managing-high-availability-clusters
- Red Hat Enterprise Linux 9 documentation: Configuring cluster resources and resource groups - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_managing_high_availability_clusters/assembly_configuring-cluster-resources-configuring-and-managing-high-availability-clusters

## Issues Found
- Corrected the explanation and heading for `prefers node=INFINITY`. Red Hat documents this as a strong preference when the node is available, not an absolute pin that prevents running elsewhere.
- Corrected the business-hours rule from `hours=9-17 weekdays=1-5` to `hours="9-16" weekdays="1-5"` because Pacemaker date-spec hour values match whole hours, so `17` would include 17:00 through 17:59:59.
- Corrected the node-attribute rule example to use the `location` node attribute that the example sets, instead of testing the built-in `#uname` attribute.
- Corrected the serialized ordering example to use `kind=Serialize`. The previous `symmetrical=true` option does not create serialized ordering, and serialized constraints cannot be symmetrical.
- Corrected the description of `pcs constraint --full` to say it displays internal IDs.
- Updated constraint deletion examples to use current documented ID-based deletion/removal syntax.
- Replaced the deprecated/incorrect resource-specific constraint display command with `pcs constraint ref VIP`, which Red Hat documents for showing constraints that reference a resource.
- Clarified that `pcs resource move` tests placement on the real cluster rather than simulating it.
- Clarified that resource groups provide implicit ordering and colocation behavior, not all three constraint categories.

## Review Notes
The post is technically relevant and accurate after the corrections. Command behavior can vary slightly by `pcs` minor version, so future updates should re-check syntax against the RHEL minor version targeted by the article.
