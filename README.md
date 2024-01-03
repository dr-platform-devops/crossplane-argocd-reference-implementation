# crossplane-argocd-reference-implementation

This is an installation guide for a lightweight local k8s automation platform equipped with Crossplane and Argo CD.

We will create a local Argo CD instance supported by a local Crossplane. We will use both of these components to provision a resource group on Azure and deploy an AKS cluster in it.

Crossplane - the cloud native control plane, which, among other capabilities, will let you manage your cloud infrastructure resources as k8s objects. It interacts with the APIs of major cloud providers and lets you manage them by familiar k8s means. More info on crossplane: https://github.com/crossplane/crossplane

This reference implementation was made with GitOps in mind. The README file assumes some k8s and helm know-how.

## Tools we will install:
- Rancher Desktop running kubernetes on your local system https://rancherdesktop.io/
- ArgoCD (With cluster-admin rights)
- Crossplane


## Installation steps:

### Rancher Desktop

This is a very simple installation without any customizations. Just download the installer for your system and install the software. In the preferences menu you can select the k8s version that you would like to run. Right click on the tray for a kubernetes dashboard and context switch buttons. I use kubectl on WSL to connect to the cluster and issue commands - and the dashboard provided by rancher desktop.


### Running the Pulumi code

Note: Pulumi is probably an overkill for this operation, but I decided to do this anyway because of easy reproducability. Feel free to helm install Argo CD and Crossplane instead of using Pulumi.

Make sure you have Pulumi installed and the Kubernetes cluster as your Kube context.

```
set PULUMI_K8S_ENABLE_PATCH_FORCE="true"
cd pulumi
pulumi up
```

Install the argocd CLI by running:
```
curl -sSL -o /usr/local/bin/argocd https://github.com/argoproj/argo-cd/releases/latest/download/argocd-linux-amd64
chmod +x /usr/local/bin/argocd
```

Now it's time to log in to argocd and on the argo CLI. You can find the admin password in the secrets on the argocd namespace. Probably the easiest way without creating ingress is to port forward with kubectl:
```
kubectl port-forward --namespace=argocd service/argocd-server 8080:80
```
In another bash run the following command to log-in to your argocd instance:
```
argocd login 127.0.0.1:8080
```

### Crossplane

Now that we have crossplane we can extend it with some more capabilities.

First of all, let's pull and install the CLI:

```
curl -sL "https://cli.upbound.io" | sh
sudo mv up /usr/local/bin/
```

Now let's install the azure provider:

```
kubectl apply -f manifests/provider.yaml
```

### Connect Azure cloud with Crossplane

Install the azure CLI:
```
curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash
```

On MacOS, run:
```
brew update && brew install azure-cli
```

And then login with:

```
az login
```

Once we are logged in, let's create a service principal.

```
az ad sp create-for-rbac --sdk-auth --role Owner > "creds.json"
```

Then, we need to get the clientId from the json file to add Azure Active Directory permissions.

```
AZURE_CLIENT_ID=$(cat creds.json | grep clientId | cut -c 16-51)
```

Set the variables we will use:

```
RW_ALL_APPS=1cda74f2-2616-4834-b122-5cb1b07f8a59
RW_DIR_DATA=78c8a3c8-a07e-4b9e-af1b-b5ccab50a175
AAD_GRAPH_API=00000002-0000-0000-c000-000000000000
```

Apply the changes:

```
az ad app permission add --id "${AZURE_CLIENT_ID}" --api ${AAD_GRAPH_API} --api-permissions ${RW_ALL_APPS}=Role ${RW_DIR_DATA}=Role
az ad app permission grant --id "${AZURE_CLIENT_ID}" --api ${AAD_GRAPH_API} --expires never > /dev/null
az ad app permission admin-consent --id "${AZURE_CLIENT_ID}"**
```

Note that some of them might not work if you are not at least an owner within your Azure account.

Lastly we need to set-up a Provider Secret and our Provider

```
kubectl create secret generic azure-creds -n crossplane-system --from-file=key=./creds.json
```

Let us use this secret with the providerconfig:
```
kubectl apply -f manifests/providerconfig.yaml
```

Now let us install our helm chart using Argo CD:

```
kubectl apply -f manifests/argoapp.yaml
```

Log in to Argo CD to apply the changes. The credentials for the 'admin' user can be found under the secret "argocd-initial-admin-secret" of the argocd namespace.

https://127.0.0.1:8080/applications


### Cold-start the env

- Start Rancher
- Port-forward the services to be used
- Port-forward argocd if you wish to connect with the argocd cli
```
kubectl port-forward --namespace=argocd service/argocd-server 8080:80
argocd login 127.0.0.1:8080
```
