// Copyright 2022 Google LLC
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

import {GithubAuthenticator} from '../github-authenticator';
import nock from 'nock';
import sinon from 'sinon';
import {MonoRepo} from '../mono-repo';
import {SplitRepo} from '../split-repo';
import * as utils from '../utils';
import {preProcess} from '../pre-process';
import {CliArgs} from '../interfaces';
import assert from 'assert';
import {Octokit} from '@octokit/rest';
import {ORG} from '../utils';

nock.disableNetConnect();

let getGitHubShortLivedAccessTokenStub: sinon.SinonStub;
let authenticateOctokitStub: sinon.SinonStub;
let cloneRepoAndOpenBranchStub: sinon.SinonStub;
let pushToBranchAndOpenPRStub: sinon.SinonStub;
let createAndInitializeEmptyGitRepoStub: sinon.SinonStub;
let pushToMainAndCreateEmptyPR: sinon.SinonStub;
let setConfigStub: sinon.SinonStub;

describe('pre processing', async () => {
  let argv: CliArgs;

  beforeEach(() => {
    getGitHubShortLivedAccessTokenStub = sinon.stub(
      GithubAuthenticator.prototype,
      'getGitHubShortLivedAccessToken'
    );

    authenticateOctokitStub = sinon.stub(
      GithubAuthenticator.prototype,
      'authenticateOctokit'
    );

    cloneRepoAndOpenBranchStub = sinon.stub(
      MonoRepo.prototype,
      'cloneRepoAndOpenBranch'
    );

    pushToBranchAndOpenPRStub = sinon.stub(
      MonoRepo.prototype,
      'pushToBranchAndOpenPR'
    );

    createAndInitializeEmptyGitRepoStub = sinon.stub(
      SplitRepo.prototype,
      'createAndInitializeEmptyGitRepo'
    );

    pushToMainAndCreateEmptyPR = sinon.stub(
      SplitRepo.prototype,
      'pushToMainAndCreateEmptyPR'
    );

    setConfigStub = sinon.stub(utils, 'setConfig');
  });

  afterEach(() => {
    getGitHubShortLivedAccessTokenStub.restore();
    authenticateOctokitStub.restore();
    cloneRepoAndOpenBranchStub.restore();
    pushToBranchAndOpenPRStub.restore();
    createAndInitializeEmptyGitRepoStub.restore();
    pushToMainAndCreateEmptyPR.restore();
    setConfigStub.restore();
  });

  it('assert right stubs are called during pre-process, monorepo', async () => {
    argv = {
      projectId: 'myprojects',
      repoToClone: 'github.com/googleapis/nodejs-kms.git',
      apiId: 'google.cloud.kms.v1',
      language: 'nodejs',
      installationId: '12345',
    };

    await preProcess(argv);
    assert.ok(getGitHubShortLivedAccessTokenStub.calledOnce);
    assert.ok(authenticateOctokitStub.calledOnce);
    assert.ok(cloneRepoAndOpenBranchStub.calledOnce);
  });

  it('calls the right stubs when entering splitrepo/pre-process', async () => {
    argv = {
      projectId: 'myprojects',
      apiId: 'google.cloud.kms.v1',
      language: 'python',
      installationId: '12345',
    };

    await preProcess(argv);
    assert.ok(getGitHubShortLivedAccessTokenStub.calledOnce);
    assert.ok(authenticateOctokitStub.calledOnce);
    assert.ok(createAndInitializeEmptyGitRepoStub.calledOnce);
  });

  it('attempts to open an issue in googleapis if any part of main fails', async () => {
    argv = {
      projectId: 'myprojects',
      apiId: 'google.cloud.kms.v1',
      language: 'python',
      installationId: '12345',
    };

    const octokit = new Octokit({auth: 'abc1234'});
    authenticateOctokitStub.returns(octokit);
    createAndInitializeEmptyGitRepoStub.rejects();

    const scope = nock('https://api.github.com')
      .post(`/repos/${ORG}/googleapis/issues`)
      .reply(201);

    await assert.rejects(() => preProcess(argv));
    scope.done();
  });

  it('attempts to open an issue in monorepo if any part of main fails', async () => {
    argv = {
      projectId: 'myprojects',
      apiId: 'google.cloud.kms.v1',
      language: 'nodejs',
      installationId: '12345',
      repoToClone: 'github.com/googleapis/nodejs-kms.git',
    };

    const octokit = new Octokit({auth: 'abc1234'});
    authenticateOctokitStub.returns(octokit);
    cloneRepoAndOpenBranchStub.rejects();

    const scope = nock('https://api.github.com')
      .post(
        `/repos/${ORG}/${
          argv.repoToClone?.match(/\/([\w-]*)(.git|$)/)![1]
        }/issues`
      )
      .reply(201);

    await assert.rejects(() => preProcess(argv));
    scope.done();
  });
});
