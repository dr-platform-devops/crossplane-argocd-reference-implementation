import * as k8s from "@pulumi/kubernetes";
import * as pulumi from "@pulumi/pulumi";

//Argo CD Deployment
const argocdnamespace = new k8s.core.v1.Namespace("argonamespace", {
    metadata: {
        name: "argocd"
    }
});

const argocd = new k8s.helm.v3.Chart("argocd", {
    chart: "argo-cd",
    namespace: argocdnamespace.metadata.name,
    fetchOpts: {
        repo: "https://argoproj.github.io/argo-helm",
    },
    values: {
    },
},
    {
        dependsOn: argocdnamespace
    }
);

//Crossplane Deployment

const crossplanenamespace = new k8s.core.v1.Namespace("crossplanenamespace", {
    metadata: {
        name: "crossplane"
    }
});


const crossplane = new k8s.helm.v3.Chart("crossplane", {
    chart: "crossplane",
    namespace: crossplanenamespace.metadata.name,
    fetchOpts: {
        repo: "https://charts.crossplane.io/master/",
    },
    values: {
        packageCache: {
            sizeLimit: "400Mi"
        },
    },
},
    {
        dependsOn: crossplanenamespace
    }
);
