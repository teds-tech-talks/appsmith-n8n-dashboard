export default {
	workflow_table: [],
	execution_table: [],
	overview_stats: {total_wf:null, active_wf:null, recent_wf:null},
	
	async store_globals () {
		await storeValue('tabpage','Loading',true);
		console.log('============');
		console.log(!!appsmith.store.n8napi && !!appsmith.store.n8nurl);
		console.log(!(!!appsmith.store.n8napi && !!appsmith.store.n8nurl));
		if(!(!!appsmith.store.n8napi && !!appsmith.store.n8nurl)) {
			showModal('Modal_enterAPI');
		} else {
			Tabs1.setVisibility(true);
			
			await n8n_get_exec.run();
			await n8n_get_wf.run();
			
			this.show_all_wf();
			this.execution_table = this.prepare_executions();
			this.overview_stats  = this.get_overview_stats();

			await storeValue('tabpage','Dashboard',true);
		}
		//Tabs1.setVisibility(false);
		return 1;
	},
	
	get_overview_stats() {
		var all_exec = n8n_get_exec.data.data;
		var all_wf = n8n_get_wf.data.data;

		var return_ = {total_wf:all_wf.length, active_wf:_.filter(all_wf,{'active': true }).length, recent_wf:_.uniqBy(all_exec, 'workflowId').length};
		
		return return_;
	},	
	
	prepare_executions() {
		var all_exec = n8n_get_exec.data.data;

		_.each(all_exec, function(item) {
			// calculate the duration in seconds
			let start_ = moment(item.startedAt);
			let stop_ = moment(item.stoppedAt);
			item.Duration = parseFloat((stop_.diff(start_, 'milliseconds')*0.001).toFixed(3));
			item.label=item.startedAt.replace('T','\n').split(".")[0];
			item.value=item.Duration;
			item.color=(item.finished ? "#85AD8B" : "#E8816D");
		});
		
		return 		_.sortBy(all_exec, function(item) {
  							return parseInt(item.id);
							});
	},
	
	/*
	show_current_wf_executions(wf_id) {
		
	}
	*/

// Prepare an array of all workflows
	prepare_workflows () {
		var all_wf = n8n_get_wf.data.data;
		all_wf = _.map(all_wf, _.partialRight(_.pick, ['name', 'id', 'createdAt', 'updatedAt', 'active']));
		
		_.each(all_wf, function(item) {
			let createdAt_ = item.createdAt.split('T');
			item.createdAt = `${createdAt_[0]} ${createdAt_[1].substring(0, 5)}`;
			
			let updatedAt_ = item.updatedAt.split('T');
			item.updatedAt = `${updatedAt_[0]} ${updatedAt_[1].substring(0, 5)}`;
			
			item.urltext = appsmith.store.n8nurl+'/workflow/'+item.id;
		});
		return all_wf;
	},
	
	show_all_wf() {
		this.workflow_table = this.prepare_workflows();
	},
	
	show_active_wf() {
		this.workflow_table = _.filter(this.prepare_workflows(),{'active': true });
	},
	
	show_recent_wf() {
		var recent_ids = _.uniqBy(n8n_get_exec.data.data, 'workflowId').map(obj => obj.workflowId); //workflowId
		console.log(recent_ids);
		this.workflow_table = _.filter(this.prepare_workflows(), function(o) { return _.includes(recent_ids, o.id); });
	},	
	
}