# Validation Summary: How to Implement Nomad Service Discovery

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Nomad
- Consul
- Service discovery
- Consul DNS
- Consul HTTP API
- Nomad job specifications
- HCL
- Docker task driver

## Sources Consulted
- HashiCorp Nomad: Configure service discovery - https://developer.hashicorp.com/nomad/docs/job-declare/service-discovery
- HashiCorp Nomad: consul block in agent configuration - https://developer.hashicorp.com/nomad/docs/configuration/consul
- HashiCorp Nomad: service block in the job specification - https://developer.hashicorp.com/nomad/docs/job-specification/service
- HashiCorp Nomad: check block in the job specification - https://developer.hashicorp.com/nomad/docs/job-specification/check
- HashiCorp Nomad: network block in the job specification - https://developer.hashicorp.com/nomad/docs/job-specification/network
- HashiCorp Consul: Health HTTP API - https://developer.hashicorp.com/consul/api-docs/health
- HashiCorp Consul: Perform static DNS queries - https://developer.hashicorp.com/consul/docs/discover/service/static
- HashiCorp Consul: Configure DNS behavior - https://developer.hashicorp.com/consul/docs/discover/dns/configure
- HashiCorp Consul: Troubleshoot Consul datacenter operations - https://developer.hashicorp.com/consul/docs/troubleshoot

## Issues Found
- The introduction claimed that Nomad does not provide built-in service discovery. Current Nomad documentation states that Nomad supports both Consul service discovery and Nomad service discovery, with Consul as the default provider. Updated the introduction to reflect this.
- The prerequisites and configuration step referred only to Nomad clients reaching Consul and to client configuration. Nomad's Consul integration is configured in the Nomad agent configuration, and clients should be able to reach a Consul agent. Updated the wording accordingly.
- The DNS section implied that applications can call `http://api.service.consul` directly for the example job. With Nomad dynamic ports, Consul DNS A records resolve healthy service addresses but do not put the dynamically allocated port into a normal HTTP URL; SRV records or the Consul API are needed to obtain the port unless the service is registered on a known port. Updated the DNS guidance to include this caveat.
- The conclusion said the setup provides load balancing. Consul DNS randomizes healthy responses and supports service discovery, but the post did not configure an actual load balancer. Updated the conclusion to avoid overstating the behavior.

## Review Notes
The Nomad job and Consul API examples are broadly valid for current Nomad and Consul. In a production Consul ACL environment, Nomad agents and workloads also need appropriate Consul ACL tokens or workload identity configuration to register services and checks.
