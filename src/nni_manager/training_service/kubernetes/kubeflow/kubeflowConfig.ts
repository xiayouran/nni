/**
 * Copyright (c) Microsoft Corporation
 * All rights reserved.
 *
 * MIT License
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated
 * documentation files (the "Software"), to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and
 * to permit persons to whom the Software is furnished to do so, subject to the following conditions:
 * The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED *AS IS*, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING
 * BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
 * DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

'use strict';

import * as assert from 'assert';
import { MethodNotImplementedError } from '../../../common/errors';
import { AzureStorage, KeyVaultConfig, KubernetesClusterConfig, KubernetesClusterConfigAzure, KubernetesClusterConfigNFS,
    KubernetesStorageKind, KubernetesTrialConfig, KubernetesTrialConfigTemplate, NFSConfig, StorageConfig
} from '../kubernetesConfig';

// operator types that kubeflow supported
export type KubeflowOperator = 'tf-operator' | 'pytorch-operator' ;
export type DistTrainRole = 'worker' | 'ps' | 'master';
export type KubeflowJobStatus = 'Created' | 'Running' | 'Failed' | 'Succeeded';
export type OperatorApiVersion = 'v1alpha2' | 'v1beta1' | 'v1beta2';

/**
 * Kubeflow Cluster Configuration
 */
export class KubeflowClusterConfig extends KubernetesClusterConfig {
    public readonly operator: KubeflowOperator;
    constructor(apiVersion: string, operator: KubeflowOperator) {
        super(apiVersion);
        this.operator = operator;
    }
}

// tslint:disable:completed-docs
export class KubeflowClusterConfigNFS extends KubernetesClusterConfigNFS {
    public readonly operator: KubeflowOperator;
    constructor(
            operator: KubeflowOperator,
            apiVersion: string,
            nfs: NFSConfig,
            storage?: KubernetesStorageKind
        ) {
        super(apiVersion, nfs, storage);
        this.operator = operator;
    }

    public get storageType(): KubernetesStorageKind {
        return 'nfs';
    }

    // tslint:disable-next-line:function-name
    public static getInstance(jsonObject: object): KubeflowClusterConfigNFS {
        const kubeflowClusterConfigObjectNFS: KubeflowClusterConfigNFS = <KubeflowClusterConfigNFS>jsonObject;
        assert (kubeflowClusterConfigObjectNFS !== undefined);

        return new KubeflowClusterConfigNFS(
            kubeflowClusterConfigObjectNFS.operator,
            kubeflowClusterConfigObjectNFS.apiVersion,
            kubeflowClusterConfigObjectNFS.nfs,
            kubeflowClusterConfigObjectNFS.storage
        );
    }
}

export class KubeflowClusterConfigAzure extends KubernetesClusterConfigAzure {
    public readonly operator: KubeflowOperator;

    constructor(
            operator: KubeflowOperator,
            apiVersion: string,
            keyVault: KeyVaultConfig,
            azureStorage: AzureStorage,
            storage?: KubernetesStorageKind
        ) {
        super(apiVersion, keyVault, azureStorage, storage);
        this.operator = operator;
    }

    public get storageType(): KubernetesStorageKind {
        return 'azureStorage';
    }

    // tslint:disable-next-line:function-name
    public static getInstance(jsonObject: object): KubeflowClusterConfigAzure {
        const kubeflowClusterConfigObjectAzure: KubeflowClusterConfigAzure = <KubeflowClusterConfigAzure>jsonObject;

        return new KubeflowClusterConfigAzure(
            kubeflowClusterConfigObjectAzure.operator,
            kubeflowClusterConfigObjectAzure.apiVersion,
            kubeflowClusterConfigObjectAzure.keyVault,
            kubeflowClusterConfigObjectAzure.azureStorage,
            kubeflowClusterConfigObjectAzure.storage
        );
    }
}

export class KubeflowClusterConfigFactory {

    // tslint:disable-next-line:function-name
    public static generateKubeflowClusterConfig(jsonObject: object): KubeflowClusterConfig {
         const storageConfig: StorageConfig = <StorageConfig>jsonObject;
         if (storageConfig === undefined) {
            throw new Error('Invalid json object as a StorageConfig instance');
        }
         if (storageConfig.storage !== undefined && storageConfig.storage === 'azureStorage') {
            return KubeflowClusterConfigAzure.getInstance(jsonObject);
         } else if (storageConfig.storage === undefined || storageConfig.storage === 'nfs') {
            return KubeflowClusterConfigNFS.getInstance(jsonObject);
         }
         throw new Error(`Invalid json object ${jsonObject}`);
    }
}

export class KubeflowTrialConfig extends KubernetesTrialConfig {
    constructor(codeDir: string) {
        super(codeDir);
    }

    public get operatorType(): KubeflowOperator {
        throw new MethodNotImplementedError();
    }
}

export class KubeflowTrialConfigTemplate extends KubernetesTrialConfigTemplate {
    public readonly replicas: number;
    constructor(replicas: number, command : string, gpuNum : number,
                cpuNum: number, memoryMB: number, image: string, privateRegistryAuthPath?: string) {
        super(command, gpuNum, cpuNum, memoryMB, image, privateRegistryAuthPath);
        this.replicas = replicas;
    }
}

export class KubeflowTrialConfigTensorflow extends KubeflowTrialConfig {
    public readonly ps?: KubeflowTrialConfigTemplate;
    public readonly worker: KubeflowTrialConfigTemplate;

    constructor(codeDir: string, worker: KubeflowTrialConfigTemplate,  ps?: KubeflowTrialConfigTemplate) {
        super(codeDir);
        this.ps = ps;
        this.worker = worker;
    }

    public get operatorType(): KubeflowOperator {
        return 'tf-operator';
    }
}

export class KubeflowTrialConfigPytorch extends KubeflowTrialConfig {
    public readonly master: KubeflowTrialConfigTemplate;
    public readonly worker?: KubeflowTrialConfigTemplate;

    constructor(codeDir: string, master: KubeflowTrialConfigTemplate, worker?: KubeflowTrialConfigTemplate) {
        super(codeDir);
        this.master = master;
        this.worker = worker;
    }

    public get operatorType(): KubeflowOperator {
        return 'pytorch-operator';
    }
}

export class KubeflowTrialConfigFactory {

    // tslint:disable-next-line:function-name
    public static generateKubeflowTrialConfig(jsonObject: object, operator: KubeflowOperator): KubeflowTrialConfig {
        if (operator === 'tf-operator') {
            const kubeflowTrialConfigObject: KubeflowTrialConfigTensorflow = <KubeflowTrialConfigTensorflow>jsonObject;

            return new KubeflowTrialConfigTensorflow(
                kubeflowTrialConfigObject.codeDir,
                kubeflowTrialConfigObject.worker,
                kubeflowTrialConfigObject.ps
            );
        } else if (operator === 'pytorch-operator') {
            const kubeflowTrialConfigObject: KubeflowTrialConfigPytorch = <KubeflowTrialConfigPytorch>jsonObject;

            return new KubeflowTrialConfigPytorch(
                kubeflowTrialConfigObject.codeDir,
                kubeflowTrialConfigObject.master,
                kubeflowTrialConfigObject.worker
            );
        }
        throw new Error(`Invalid json object ${jsonObject}`);
    }
}