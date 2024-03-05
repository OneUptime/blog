# How moving from AWS to Bare-Metal saved us $230,000 /yr.

Author: [devneelpatel](https://www.github.com/devneelpatel)

Tags: AWS, Cloud

Description: How technologies like Docker, Kubernetes, Helm, Microk8s, Ceph and more make transitioning to bare-metal infrastructure significantly easier than it was just a few years ago.

In the ever-evolving world of technology, businesses are constantly looking for ways to optimize their operations and reduce costs. One such journey we embarked on was moving our infrastructure from Amazon Web Services (AWS) to a bare-metal solution. This transition not only provided us with more control over our resources but also resulted in substantial financial savings.

While the cost savings and technological benefits were significant factors in our decision to move from AWS to a bare-metal solution, there was another crucial reason behind this transition.

**Most of our customers are on the public cloud, and part of our service involves notifying them when the public cloud goes down. To ensure we can provide this service reliably and independently of the public cloud’s status, we needed to be on our own dedicated data center.**

By moving to a bare-metal solution in a colocation facility, we’ve been able to achieve this independence. This move has not only resulted in substantial cost savings but also enhanced our service reliability and customer communication, further demonstrating the multifaceted benefits of considering alternative infrastructure solutions.


### Our Initial Setup: Kubernetes on AWS

In the early stages of our technological journey, we adopted a Kubernetes cluster on Amazon Web Services (AWS), utilizing their managed Elastic Kubernetes Service (EKS) offering.

OneUptime, our open-source observability platform is built on a robust foundation of open-source software such as Redis, Postgres, Clickhouse, Docker, NodeJS, and BullMQ. Interestingly, none of these technologies are AWS-specific. This choice was intentional and strategic.

**Our goal was to avoid reliance on AWS or any proprietary cloud technology.** The reason? We wanted to empower our customers with the ability to self-host OneUptime on their own clusters. This approach not only aligns with our commitment to open-source but also provides our customers with greater control and flexibility. For those interested in self-hosting OneUptime, the Helm chart is readily available on [Artifact Hub here](https://artifacthub.io/packages/helm/oneuptime/oneuptime?ref=blog.oneuptime.com).

While AWS offered us flexibility and scalability, we began to realize that these benefits could be achieved elsewhere and at a fraction of the cost. This realization sparked a shift in our approach and led us to explore more cost-effective yet equally efficient alternatives.

### The Transition: Moving to Bare-Metal

In our continuous pursuit of technological excellence, we recently made the strategic decision to transition to a bare-metal solution. Our choice was to run a Microk8s cluster in a colocation facility, a decision driven by our past experiences and future aspirations.

Historically, we’ve always maintained an internal self-hosted test cluster on Microk8s. This hands-on experience with a Kubernetes flavor not only enriched our understanding but also bolstered our confidence in setting up a production-ready cluster.

**There’s a common misconception that Microk8s is solely for edge computing or development purposes. However, this couldn’t be further from the truth. In fact, numerous companies, including ours, are now leveraging Microk8s in production environments.** This shift is testament to the robustness and versatility of Microk8s, proving it to be a viable option for diverse use-cases.

Transitioning to bare-metal servers has provided us with dedicated resources, effectively eliminating the ‘noisy neighbor’ issue often experienced in shared hosting environments like AWS. This issue arises when multiple customers share the same server resources, leading to performance degradation if one customer hogs more than their fair share of resources.

Now, we have complete control over our hardware. This autonomy allows us to fine-tune our servers to meet our specific needs, optimizing performance and efficiency. We can customize every aspect of our infrastructure, from the operating system and network architecture to the type and amount of storage used.


### The Role of Kubernetes and Helm in Our Transition

Technologies like **Kubernetes** and **Helm** have played a significant role in our transition from the cloud to our own servers. Kubernetes, an open-source platform designed to automate deploying, scaling, and operating application containers, has made it easier for us to manage our applications on our own servers.

Helm, on the other hand, is a package manager for Kubernetes that simplifies the process of defining, installing, and upgrading complex Kubernetes applications. It’s like a homebrew for Kubernetes; it packages up applications into charts (collections of files that describe a related set of Kubernetes resources) that can be deployed onto your cluster.

These technologies have made it incredibly easy to ‘de-cloud’ and move to our own servers. They’ve provided us with the flexibility and control we needed while ensuring that the transition was smooth and efficient.


### Storage and LoadBalancers

Most people are confused on how are volumes provisioned and how are load balancers provisioned on a bare metal kubernets cluster,

We use MicroCeph for volumes. Ceph is a distributed storage cluster. Microk8s makes it incredibly easy to implement Ceph storage, which has been a significant advantage for us. You can check their docs here on how to configure one: https://microk8s.io/docs/addon-rook-ceph

For managing publicly facing services, we use MetalLB. MetalLB is a load-balancer implementation for bare metal Kubernetes clusters, using standard routing protocols. Microk8s offers a plugin that simplifies the process of integrating MetalLB into our setup. You can check the docs here: https://microk8s.io/docs/addon-metallb

We will do a blog post soon to explain how to configure these if you're thinking about de-clouding yourself.

### The Financial Impact: Saving $230,000+ per Year

#### Before Migration

When we were utilizing AWS, our setup consisted of a 28-node managed Kubernetes cluster. Each of these nodes was an m7a EC2 instance. With block storage and network fees included, our monthly bills amounted to $38,000+. This brought our annual expenditure to over $456,000+.

#### After Migration

We transitioned to using a single rack configuration at our co-location partner, providing us with 40 rack units of usable space. With each server being 2U - we could potentially rack about 18 of them (other U's are usually for networking equipment). Each of our servers are upgradeable to over 1 TB of RAM and has 2 socket 128 core CPU with about 80 TB usable of storage in our storage cluster.

The financial implications of this move were significant. We allocated and invested $150,000 in new servers for our bare-metal setup. While this might appear as a substantial upfront cost, the long-term savings have been nothing short of remarkable.

Our monthly operational expenditure (op-ex), which includes power, cooling, energy, and remote hands (although we seldom use this service), is now approximately $5,500. When compared to our previous AWS costs, we’re saving over $230,000 roughly per year if you amortize the cap-ex costs of the server over 5 years. This substantial reduction in expenses has enabled us to allocate resources to other critical areas of our business and has facilitated the hiring of more engineers. **Thats over 55% in savings for better compute!**

### Things to Consider

- **Backups:** We back up all of our data multiple times a day to a storage server located at two of our offices - one in Boston, US, and the other in London, UK. You can also do this to a public cloud. We think its easier and cheaper to do it on-prem.

- **Multi Location Cluster:** You could also run a multi-location kubernetes cluster on two different co-location facility with 2 different co-location partners in 2 different continents for higher redundancy. You could potentally do this by creating a VPN between these two locations.

- **Backup Cluster:** We have a ready to go backup cluster on AWS that can spin up in under 10 minutes if something were to happen to our co-location facility. Helm charts + k8s make it really easy to spin these up. We still use AWS in disaster scenarios and haven't closed our AWS account just yet!

- **Server Admins:** When planning a transition to bare metal, many believe that hiring server administrators is a necessity. While their role is undeniably important, it’s worth noting that a substantial part of hardware maintenance is actually managed by the colocation facility. In the context of AWS, the expenses associated with employing AWS administrators often exceed those of Linux on-premises server administrators. This represents an additional cost-saving benefit when shifting to bare metal. With today’s servers being both efficient and reliable, the need for “management” has significantly decreased.

- **Use of Microk8s:** There is a common misconception that Microk8s is only for edge computing or development purposes. However, this is not true at all. Microk8s is a small, fast, and single-package Kubernetes distribution that can run on any platform. Many companies, including ours, are using Microk8s in production environments and the official documentation supports this use case. We have been very satisfied with Microk8s so far, but we are also flexible to change to another Kubernetes distribution if needed. The beauty of Kubernetes is that it is portable, extensible, and open source, so switching flavors is easy. We chose Kubernetes because it is the best platform for managing containerized workloads and services.

### Conclusion

Our transition from AWS to bare-metal infrastructure underscores the fact that while cloud services such as AWS offer robust flexibility and power, they may not always be the most economical choice for every enterprise. By harnessing the power of open-source technologies and investing in our own hardware, we’ve not only gained greater control over our resources but also realized substantial savings in operational costs.

It’s important to remember that each business has its own unique needs. What proved successful for us may not necessarily yield the same results for everyone. Therefore, conducting a comprehensive evaluation of your specific requirements is crucial before undertaking such a transition.

Thanks to advancements in technologies like Docker, Kubernetes, Helm, Microk8s, and more, transitioning to bare-metal infrastructure is now significantly easier than it was just a few years ago.


