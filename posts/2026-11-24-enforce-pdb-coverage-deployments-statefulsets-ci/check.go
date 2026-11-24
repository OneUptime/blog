package main

import (
	"encoding/json"
	"fmt"
	"io"
	"os"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/labels"
	"k8s.io/apimachinery/pkg/util/yaml"
)

type object struct {
	metav1.TypeMeta
	Metadata metav1.ObjectMeta `json:"metadata"`
	Spec     struct {
		Replicas       *int32                                  `json:"replicas"`
		MaxReplicas    int32                                   `json:"maxReplicas"`
		ScaleTargetRef struct{ APIVersion, Kind, Name string } `json:"scaleTargetRef"`
		Selector       *metav1.LabelSelector                   `json:"selector"`
		Template       struct {
			Metadata metav1.ObjectMeta `json:"metadata"`
		} `json:"template"`
	} `json:"spec"`
}

func key(namespace, kind, name string) string { return namespace + "/" + kind + "/" + name }

func check(r io.Reader, namespace string) error {
	decoder := yaml.NewYAMLOrJSONDecoder(r, 4096)
	var objects []object
	seen := map[string]bool{}
	for {
		var raw json.RawMessage
		if err := decoder.Decode(&raw); err == io.EOF {
			break
		} else if err != nil {
			return err
		}
		if len(raw) == 0 {
			continue
		}
		var header metav1.TypeMeta
		if err := json.Unmarshal(raw, &header); err != nil {
			return err
		}
		if header.Kind == "List" {
			return fmt.Errorf("flatten List documents before checking")
		}
		switch header.Kind {
		case "Deployment", "StatefulSet", "PodDisruptionBudget", "HorizontalPodAutoscaler":
		default:
			continue
		}
		var o object
		if err := json.Unmarshal(raw, &o); err != nil {
			return err
		}
		if o.Metadata.Namespace == "" {
			o.Metadata.Namespace = namespace
		}
		id := key(o.Metadata.Namespace, o.Kind, o.Metadata.Name)
		if seen[id] {
			return fmt.Errorf("duplicate resource: %s", id)
		}
		seen[id] = true
		objects = append(objects, o)
	}
	autoscaled := map[string]bool{}
	pdbs := map[string][]labels.Selector{}
	for _, o := range objects {
		if o.Kind == "HorizontalPodAutoscaler" {
			if o.APIVersion != "autoscaling/v2" {
				return fmt.Errorf("use autoscaling/v2 HPA input")
			}
			ref := o.Spec.ScaleTargetRef
			if ref.APIVersion == "apps/v1" && o.Spec.MaxReplicas > 1 {
				autoscaled[key(o.Metadata.Namespace, ref.Kind, ref.Name)] = true
			}
		}
		if o.Kind == "PodDisruptionBudget" {
			if o.APIVersion != "policy/v1" {
				return fmt.Errorf("use policy/v1 PDB input")
			}
			selector, err := metav1.LabelSelectorAsSelector(o.Spec.Selector)
			if err != nil {
				return err
			}
			if selector.Empty() {
				return fmt.Errorf("namespace-wide PDB: %s", o.Metadata.Name)
			}
			pdbs[o.Metadata.Namespace] = append(pdbs[o.Metadata.Namespace], selector)
		}
	}
	checked := 0
	for _, o := range objects {
		if o.Kind != "Deployment" && o.Kind != "StatefulSet" {
			continue
		}
		if o.APIVersion != "apps/v1" {
			return fmt.Errorf("use apps/v1 workload input")
		}
		replicas := int32(1)
		if o.Spec.Replicas != nil {
			replicas = *o.Spec.Replicas
		}
		id := key(o.Metadata.Namespace, o.Kind, o.Metadata.Name)
		if replicas <= 1 && !autoscaled[id] {
			continue
		}
		matches := 0
		for _, selector := range pdbs[o.Metadata.Namespace] {
			if selector.Matches(labels.Set(o.Spec.Template.Metadata.Labels)) {
				matches++
			}
		}
		if matches != 1 {
			return fmt.Errorf("%s: expected one PDB, found %d", id, matches)
		}
		checked++
	}
	fmt.Printf("PDB coverage passed: %d workloads checked\n", checked)
	return nil
}

func main() {
	if len(os.Args) != 2 || os.Args[1] == "" {
		fmt.Fprintln(os.Stderr, "usage: pdb-coverage DEFAULT_NAMESPACE < rendered.yaml")
		os.Exit(2)
	}
	if err := check(os.Stdin, os.Args[1]); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}
