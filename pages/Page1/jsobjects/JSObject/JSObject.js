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


	// calculate wf metrics during the loading time
	create_workflow_metrics(wf_data) {
		var wf_metrics = {};
		wf_metrics.nodes_all = wf_data.nodes.length;
		wf_metrics.nodes_names = _.uniqBy(wf_data.nodes, 'type').map(obj => obj.type).sort();
		wf_metrics.nodes_unique = wf_metrics.nodes_names.length;
		return wf_metrics;
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
		
		// calculate basic wf metrics at the loading time to reduce unnecessary data manipulations
		this.raw_wf_data = all_wf;
		_.each(this.raw_wf_data, function(item) {
			item.metrics = this.create_workflow_metrics(item);
		});
		
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
	
	// show wf metrics in the container widget
	show_workflow_metrics(id) {
		var wf_text = "";
		var wf_data = "";
		if(id){
			wf_data = _.find(this.raw_wf_data, function(obj) { return obj.id == id; });
			
			wf_text += `<b>Name:</b> ${wf_data.name}\n`;
			wf_text += `<b>ID:</b> ${wf_data.id}\n`;
			wf_text += `<b>Active:</b> ${wf_data.active.toString()}\n`;
			wf_text += `\n`;
			wf_text += `<b>Total Number of Nodes:</b> ${wf_data.metrics.nodes_all}\n`;
			wf_text += `<b>Unique Nodes:</b> ${wf_data.metrics.nodes_unique}\n`;
			wf_text += `<b>Node Types:</b> \n`;
			wf_text += `${wf_data.metrics.nodes_names.map(item => `<a href="https://n8n.io/integrations/${item}" target="_blank" rel="noopener noreferrer">${item}</a>`).join('\n')}\n`;
			// <a href="https://fas.st/t/idH9ZSyP" target="_blank" rel="noopener noreferrer">n8n</a>
		}
		console.log(wf_data);
		console.log(wf_text);
		this.workflow_metrics = wf_text;
		return 1;
	},
	
	// 
	async get_wf_autodoc(id,type="short"){
		
		var system_prompt = `You are an expert technical writer and your task is to prepare a documentation for the workflow, which was created in n8n - a workflow automation tool. You will receive a JSON containing the workflow data. You need to analyse it and prepare a documentation text accoring to the user request. Include the timestamp of the generated documentation page: ${moment().format("DD MMM dddd, YYYY HH:mm")} . Please return you reply in a markdown format.`;
		
		/*
		var system_prompt = `You are an expert technical writer and your task is to prepare a documentation for the workflow, which was created in n8n - a workflow automation tool. You will receive a JSON containing the workflow data. You need to analyse it and prepare a documentation text accoring to the user request. Include the timestamp of the generated documentation page: ${moment().format("DD MMM dddd, YYYY HH:mm")} . Please return you reply in an HTML format without header / body tags, because your reply will be placed inside a <div class="container mt-3"> contanier. You can use Bootstrap 5 styles.`;
		*/
		var usertext = {
			"short":"Please provide the brief description of the workflow. ",
			"long":"Please provide the detailed description of the workflow. Begin with a paragraph text with the workflow overview. Then continue describing each node in a numbered list. "
		}
		
		var wf_data = _.find(this.raw_wf_data, function(obj) { return obj.id == id; });
		    wf_data = _.pick(wf_data, ['createdAt', 'updatedAt', 'name', 'active', 'nodes', 'connections']);
		    wf_data.nodes = _.map(wf_data.nodes, _.partialRight(_.pick, ['parameters', 'name', 'type']));
		console.log(wf_data);
				
		var config_ = {
			model:"gpt-4-1106-preview",
			temperature:0.5,
			messages:[
				{role:"system","content":system_prompt},
				{role:"user","content":usertext[type]+"Here is the workflow JSON: ```" + JSON.stringify(wf_data) + "```"}
			]
		}
		
		console.log(config_);
		var GPT_autodoc = await Workflow_docs.run(config_);
		this.workflow_docs = GPT_autodoc.choices[0].message.content;
		//var GPT_final_req = {};
		return 1;
	}, // end of get_wf_autodoc

	prepare_download(data){
		var pageheader=`<!DOCTYPE html>
										<html>
										<head>
										<meta charset="utf-8">
										<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet" integrity="sha384-T3c6CoIi6uLrA9TneNEoa7RxnatzjcDSCmG1MXxSR1GAsXEV/Dwwykc2MPK8M2HN" crossorigin="anonymous">
										</head>
										<body>
										<div class="container mt-3">`;
		
		var pagefooter=`</div>
										</body>
										</html>`;
		
		return `${pageheader}
						${data}
						${pagefooter}`;

	}
}



//