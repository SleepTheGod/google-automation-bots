// Copyright 2020 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import {Storage} from '@google-cloud/storage';
import {GCFLogger} from 'gcf-utils';

const storage = new Storage();

export interface ApiLabel {
  api_shortname: string; // run
  region_tag_prefix: string; // cloudrun
  title: string; // Cloud Run
  github_label: string; // api: run
}

export interface ApiLabels {
  products: Array<ApiLabel>;
}

export const getApiLabels = async (
  dataBucket: string,
  logger: GCFLogger
): Promise<ApiLabels> => {
  const apis = await storage
    .bucket(dataBucket)
    .file('products.json')
    .download();
  const parsedResponse = JSON.parse(apis[0].toString()) as ApiLabels;
  logger.debug({apiLabels: parsedResponse});
  return parsedResponse;
};
