export default {
	workflow_table: [],
	all_executions: [],
	all_workflows: [],
	raw_wf_data: [],
	overview_stats: {total_wf:null, active_wf:null, recent_wf:null, recent_runs:null},

	workflow_docs: "Empty doc",
	workflow_metrics: "Empty metrics",

	async store_globals () {
		await storeValue('tabpage','Loading',true);
		this.overview_stats = {total_wf:null, active_wf:null, recent_wf:null};

		if(!(!!appsmith.store.n8napi && !!appsmith.store.n8nurl)) {
			showModal('Modal_enterAPI');
		} else {
			Tabs1.setVisibility(true);

			var bla2 = await this.prepare_executions();
			this.all_executions = bla2;

			var bla1 = await this.prepare_workflows();
			this.all_workflows  = bla1;

			this.overview_stats  = this.get_overview_stats();

			this.show_all_wf();

			await storeValue('tabpage','Dashboard',true);
		}
		//Tabs1.setVisibility(false);
		return 1;
	},

	get_overview_stats() {
		var all_exec = this.all_executions;
		var all_wf   = this.all_workflows;

		var return_ = {total_wf:all_wf.length,
									 active_wf:_.filter(all_wf,{'active': true }).length,
									 recent_wf:_.uniqBy(all_exec, 'workflowId').length,
									 recent_runs:all_exec.length};

		return return_;
	},	

	async prepare_executions() {
		await n8n_get_exec.run();
		var all_exec = n8n_get_exec.data.data;

		// if there are more results than for one page
		// limit to 4 iterations, which gives up to 1000 items
		var nextcursor_ = n8n_get_exec.data.nextCursor;
		for (let i = 0; i < 3; i++) {
			if(nextcursor_) {
				await n8n_get_exec_nextpage.run({cursor:nextcursor_});
				//console.log(all_exec.length);
				all_exec = all_exec.concat(n8n_get_exec_nextpage.data.data);
				//console.log(all_exec.length);
				nextcursor_ = n8n_get_exec_nextpage.data.nextCursor;
			} else { break; }
		}

		_.each(all_exec, function(item) {
			// calculate the duration in seconds
			let start_ = moment(item.startedAt);
			let stop_ = moment(item.stoppedAt);
			item.Duration = parseFloat((stop_.diff(start_, 'milliseconds')*0.001).toFixed(3));
			item.label=item.startedAt.replace('T','\n').split(".")[0];
			item.value=item.Duration;
			item.color=(item.finished ? chroma(appsmith.theme.colors.primaryColor).brighten(0.5).hex() : chroma(appsmith.theme.colors.primaryColor).set('hsl.h', (chroma(appsmith.theme.colors.primaryColor).get('hsl.h') + 45*3) % 360).hex());
		});
		console.log(all_exec.length);
		return 	_.sortBy(all_exec, function(item) {
			return parseInt(item.id);
		});
	},



	// Prepare an array of all workflows
	async prepare_workflows () {
		await n8n_get_wf.run();
		var all_wf = n8n_get_wf.data.data;

		// if there are more results than for one page
		// limit to 4 iterations, which gives up to 1000 items
		var nextcursor_ = n8n_get_wf.data.nextCursor;
		for (let i = 0; i < 3; i++) {
			if(nextcursor_) {
				await n8n_get_wf_nextpage.run({cursor:nextcursor_});
				all_wf = all_wf.concat(n8n_get_wf_nextpage.data.data);
				nextcursor_ = n8n_get_wf_nextpage.data.nextCursor;
			} else { break; }
		}
		
		this.raw_wf_data = all_wf;

		all_wf = _.map(all_wf, _.partialRight(_.pick, ['name', 'id', 'createdAt', 'updatedAt', 'active']));

		let recent_ids = _.countBy(this.all_executions, 'workflowId');
		console.log(recent_ids);
		
		_.each(all_wf, function(item) {
			let createdAt_ = item.createdAt.split('T');
			item.createdAt = `${createdAt_[0]} ${createdAt_[1].substring(0, 5)}`;

			let updatedAt_ = item.updatedAt.split('T');
			item.updatedAt = `${updatedAt_[0]} ${updatedAt_[1].substring(0, 5)}`;
			item.exec_count= recent_ids[item.id]||null;
			item.recent_run= !!recent_ids[item.id];
			item.urltext = appsmith.store.n8nurl+'/workflow/'+item.id;
		});
		return all_wf;
	},

	show_all_wf() {
		this.workflow_table = this.all_workflows;
	},

	show_active_wf() {
		this.workflow_table = _.filter(this.all_workflows,{'active': true });
	},

	show_recent_wf() {
		var recent_ids = _.uniqBy(this.all_executions, 'workflowId').map(obj => obj.workflowId); //workflowId
		//console.log(recent_ids);
		this.workflow_table = _.filter(this.all_workflows, function(o) { return _.includes(recent_ids, o.id); });
	},
	
	create_workflow_metrics(id) {
		var wf_text = "";
		if(id){
			var wf_text = _.find(this.raw_wf_data, function(obj) { return obj.id == id; });
		}
		this.workflow_metrics = wf_text;
		return 1;
	}

}



//