// Real plugin registration + real POSIX canonical/stat operations on fixtures.
// SDK/React are transport fixtures; no Desktop Windows claim.
const assert=require('node:assert/strict')
const fs=require('node:fs'), path=require('node:path'),vm=require('node:vm')
const {execFileSync}=require('node:child_process')
const pluginPath=process.env.VAULT_PLUGIN_SOURCE || (fs.existsSync(path.join(__dirname,'candidate/plugin.js')) ? path.join(__dirname,'candidate/plugin.js') : path.join(__dirname,'..','plugin.js'))
const source=fs.readFileSync(pluginPath,'utf8').replace(/^import .*$/gm,'').replace('export default {','globalThis.plugin = {')
const root=fs.mkdtempSync(path.join(process.env.TMPDIR || __dirname,'vault-note-fixture-'))
fs.mkdirSync(path.join(root,'Notes')); fs.mkdirSync(path.join(root,'.obsidian'))
const relative='Notes/Recette été — accès ERP.md'
fs.writeFileSync(path.join(root,relative),'# Recette synthétique\n')
const outside=path.join(root,'..',path.basename(root)+'-outside.md'); fs.writeFileSync(outside,'outside')
fs.symlinkSync(outside,path.join(root,'Notes/escape.md'))
const registrations=[],opened=[],closed=[],revealed=[],notices=[],commands=[],downloads=[],saved=new Map([['vault-view:vault-path',root]])
const host={state:{focusedStoredSessionId:{get:()=> 'chat-a'},focusedSessionId:{get:()=> 'runtime-a'},focusedSessionProfile:{get:()=> 'default'}},
 openWorkspace:(id,options)=>{opened.push({id,options});return ()=>closed.push(id)},
 revealPane:id=>revealed.push(id),
 notify:notice=>notices.push(notice), notifyError:()=>{},
 request:async(method,args)=>{assert.equal(method,'shell.exec');commands.push(args.command);return {stdout:execFileSync('/bin/sh',['-c',args.command],{encoding:'utf8'}),code:0}}
}
const sandbox={console,TextEncoder,TextDecoder,Uint8Array,URL,atob,btoa,Promise,Map,Set,host,
 setTimeout:()=>1,clearTimeout(){},setInterval:()=>2,clearInterval(){},
 PALETTE_AREA:'palette', COMPOSER_AREAS:{middleware:'middleware',attachments:'attachments'},
 vaultTranscriptSdk:{TRANSCRIPT_DIRECTIVE_AREA:'transcript.directives',TOOL_MEDIA_RENDERER_AREA:'transcript.toolMedia',captureGatewayFileDownload:()=> (file,name)=>{downloads.push({file,name});return Promise.resolve()}},
 Codicon(){},jsx:(type,props)=>({type,props}),jsxs:(type,props)=>({type,props}),
 useState:value=>[typeof value==='function'?value():value,()=>{}],useRef:value=>({current:value}),useEffect(){},useCallback:fn=>fn,useMemo:fn=>fn(),useTheme:()=>({}),usePluginI18n:()=>key=>key}
sandbox.globalThis=sandbox
vm.runInNewContext(source+`\nglobalThis.testState={ tabs:()=>vaultTabs, openAction:(attrs,sessionId)=>actOnTranscriptVaultNote(attrs,sessionId,'open'), seed:()=>{const id=openVaultTab('/synthetic/Draft.md');vaultTabs.get(id).snapshot={rawContent:'DRAFT NON ENREGISTRÉ',savedContent:'old',activePath:'/synthetic/Draft.md'};return id} };`,sandbox)
const ctx={storage:{get:(key,fallback)=>saved.get(key)??fallback,set:(key,value)=>saved.set(key,value)},i18n:{register(){},t:key=>key},register:entry=>registrations.push(entry),onDispose(){}}
sandbox.plugin.register(ctx)
async function main(){
 const entry=registrations.find(entry=>entry.area==='transcript.directives'&&entry.data?.name==='vault-note')
 assert.ok(entry,'Vault View must register the supported vault-note transcript action')
 const media=registrations.find(entry=>entry.area==='transcript.toolMedia'&&entry.data?.tools.includes('vault_view_present_note'))
 assert.ok(media,'Vault View must register its own tool-media card')
 const fallback={type:'native-card'}
 const toolResult={success:true,file:path.join(root,relative),vault:path.basename(root),path:relative}
 const mediaProps={file:{path:toolResult.file},result:JSON.stringify(toolResult),sessionId:'chat-a',fallback}
 const mediaElement=media.data.render(mediaProps)
 const initialUseState=sandbox.useState
 sandbox.useState=value=>[value===''?root:value,()=>{}]
 const ownedMedia=mediaElement.type(mediaElement.props)
 assert.equal(ownedMedia.type(ownedMedia.props).type,'div','owned note renders the Vault View card')
 assert.equal(mediaElement.type({...mediaElement.props,file:{path:'/different.md'}}),fallback,'mismatched file keeps native card')
 assert.equal(mediaElement.type({...mediaElement.props,result:'invalid'}),fallback,'untrusted result keeps native card')
 const before=opened.length
 const renderCard=props=>{const element=entry.data.render(props);return element&&element.type(element.props)}
 const card=renderCard({attrs:{vault:path.basename(root),path:relative},streaming:false,sessionId:'chat-a'})
 assert.equal(card.type,'div'); assert.equal(opened.length,before,'render must never open a note')
 assert.equal(card.props.children[1].props.children,path.basename(relative),'card shows the Markdown filename')
 const [downloadButton,openButton]=card.props.children.slice(2)
 assert.equal(openButton.type,'button');assert.equal(downloadButton.type,'button')
 assert.equal(card.props.children.length,4,'the closed note card shows Download and Open only')
 assert.equal(openButton.props.children,'transcriptOpenNote')
 const first=sandbox.testState.seed(),snapshot=sandbox.testState.tabs().get(first).snapshot
 const result=await openButton.props.onClick()
 assert.ok(result,'click must open a note')
 assert.equal(opened.at(-1).options.render().props.initialPath,path.join(root,relative))
 assert.notEqual(opened.at(-1).id,first,'click must open a fresh tab')
 assert.equal(sandbox.testState.tabs().get(first).snapshot,snapshot)
 assert.equal(snapshot.rawContent,'DRAFT NON ENREGISTRÉ');assert.deepEqual(closed,[])
 const openedCard=renderCard({attrs:{vault:path.basename(root),path:relative},streaming:false,sessionId:'chat-a'})
 const hideButton=openedCard.props.children[3]
 assert.equal(openedCard.props.children.length,4,'the open note card still has one note action')
 assert.equal(hideButton.props.children,'hideNote','Hide note replaces Open while the note is open')
 console.log('PASS: supported directive click opens exact accented/spaced note in fresh tab; original draft retained')
 assert.equal(await downloadButton.props.onClick(),true)
 assert.deepEqual(downloads,[{file:path.join(root,relative),name:path.basename(relative)}])
 assert.equal(opened.length,before+2,'download must not open a tab')
 console.log('PASS: download uses the canonical checked Markdown path and original filename')
 const count=opened.length
 for(const bad of ['../outside.md','/etc/passwd.md','https://example.com/a.md','obsidian://open.md','Notes/%2e%2e/bad.md','.obsidian/secret.md','.trash/deleted.md','Notes/../secret.md','Notes/a\\\\b.md','Notes/a\n.md']) {
   const badButton=renderCard({attrs:{vault:path.basename(root),path:bad},sessionId:'chat-a',streaming:false})
   assert.equal(badButton,null,'untrusted path must not become an action: '+JSON.stringify(bad))
 }
 const click=async(attrs,sessionId='chat-a',streaming=false,action='open')=>{
  const control=renderCard({attrs,sessionId,streaming});return control ? await control.props.children[action==='download'?2:3].props.onClick() : false
 }
 assert.equal(await click({vault:path.basename(root),path:'Notes/escape.md'}),false,'canonical symlink escape rejected')
 assert.equal(await click({vault:path.basename(root),path:'Notes/missing.md'}),false,'missing note rejected')
 assert.equal(await click({vault:path.basename(root),path:'Notes/missing.md'},'chat-a',false,'download'),false,'missing note cannot download')
 assert.equal(await click({vault:'another-vault',path:relative}),false,'wrong vault rejected')
 const beforeWrongSession=commands.length
 assert.equal(await sandbox.testState.openAction({vault:path.basename(root),path:relative},'chat-b'),false,'wrong focused session rejected')
 assert.equal(await click({vault:path.basename(root),path:relative},'chat-b',false,'download'),false,'wrong chat cannot download')
 assert.equal(commands.length,beforeWrongSession,'wrong chat performs no filesystem request')
 assert.equal(await click({vault:path.basename(root),path:relative},'chat-a',true),false,'streaming note action stays inert')
 assert.equal(await click({vault:path.basename(root),path:relative},'chat-a',true,'download'),false,'streaming download stays inert')
 assert.equal(await click({path:relative}),false,'missing vault stays inert')
 const downloadSdk=sandbox.vaultTranscriptSdk.captureGatewayFileDownload
 sandbox.vaultTranscriptSdk.captureGatewayFileDownload=undefined
 const beforeUnavailable=commands.length
 assert.equal(await click({vault:path.basename(root),path:relative},'chat-a',false,'download'),false,'host without download SDK must fail closed')
 assert.equal(commands.length,beforeUnavailable,'unavailable download performs no filesystem request')
 sandbox.vaultTranscriptSdk.captureGatewayFileDownload=downloadSdk
 const originalRequest=host.request
 host.request=async(...args)=>{const answer=await originalRequest(...args);saved.set('vault-view:vault-path','/synthetic/changed-vault');return answer}
 assert.equal(await sandbox.testState.openAction({vault:path.basename(root),path:relative},'chat-a'),false,'vault switch during request aborts opening')
 host.request=originalRequest;saved.set('vault-view:vault-path',root)
 assert.equal(opened.length,count,'rejected actions open no tab')
 assert.equal(downloads.length,1,'rejected actions save no files')
 assert.equal(sandbox.testState.tabs().get(first).snapshot,snapshot);assert.deepEqual(closed,[])
 const wrongChatCard=renderCard({attrs:{vault:path.basename(root),path:relative},sessionId:'chat-b',streaming:false})
 assert.equal(wrongChatCard.props.children[3].props.onClick(),false,'another chat cannot hide the focused workspace')
 assert.deepEqual(closed,[])
 const streamingCard=renderCard({attrs:{vault:path.basename(root),path:relative},sessionId:'chat-a',streaming:true})
 assert.equal(streamingCard.props.children[3].props.onClick(),false,'streaming deep links cannot hide the workspace')
 assert.equal(hideButton.props.onClick(),true,'the deep-link Hide note action hides Vault View')
 assert.equal(sandbox.testState.tabs().get(first).snapshot,snapshot,'hiding keeps the unsaved draft')
 assert.equal(sandbox.testState.tabs().size,2,'hiding retains the open tabs')
 assert.equal(closed.length,2,'hiding retires both registered panes')
 const maskedCard=renderCard({attrs:{vault:path.basename(root),path:relative},streaming:false,sessionId:'chat-a'})
 assert.equal(maskedCard.props.children[3].props.children,'transcriptOpenNote','Open replaces Hide note after masking')
 assert.equal(await maskedCard.props.children[3].props.onClick(),opened.at(-1).id,'Open restores the masked note tab')
 assert.equal(sandbox.testState.tabs().size,2,'restoring through the card creates no duplicate tab')
 sandbox.useState=initialUseState
 console.log('PASS: traversal/protocol/control/metadata/symlink/missing/wrong-vault/wrong-chat/streaming/stale-context rejected; no close/save')
}
main().finally(()=>{fs.rmSync(root,{recursive:true,force:true});fs.rmSync(outside,{force:true})}).catch(error=>{console.error(error);process.exitCode=1})
