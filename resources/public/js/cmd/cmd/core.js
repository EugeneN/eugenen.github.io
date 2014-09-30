// Compiled by ClojureScript 0.0-2202
goog.provide('cmd.core');
goog.require('cljs.core');
goog.require('cmd.utils');
goog.require('cmd.defs');
goog.require('cljs.core.async');
goog.require('alandipert.storage_atom');
goog.require('cmd.lib');
goog.require('cljs.core.async');
goog.require('alandipert.storage_atom');
goog.require('cmd.defs');
goog.require('cmd.lib');
goog.require('cmd.utils');
goog.require('clojure.set');
goog.require('clojure.set');
cmd.core.prefs = alandipert.storage_atom.local_storage.call(null,cljs.core.atom.call(null,cljs.core.PersistentArrayMap.EMPTY),new cljs.core.Keyword(null,"prefs","prefs",1120835106));
cmd.core.set_prefs = (function set_prefs(name,value){return cljs.core.swap_BANG_.call(null,cmd.core.prefs,cljs.core.assoc,name,value);
});
cmd.core.get_prefs = (function get_prefs(name){return cljs.core.deref.call(null,cmd.core.prefs).call(null,name);
});
cmd.core.state = cljs.core.atom.call(null,new cljs.core.PersistentArrayMap(null, 4, [new cljs.core.Keyword(null,"active-requests","active-requests",3616398877),0,new cljs.core.Keyword(null,"pinned-gists","pinned-gists",1364707149),cmd.core.get_prefs.call(null,new cljs.core.Keyword(null,"pinned-gists","pinned-gists",1364707149)),new cljs.core.Keyword(null,"latest-opened","latest-opened",1537368289),(function (){var saved_pref = cmd.core.get_prefs.call(null,new cljs.core.Keyword(null,"latest-opened","latest-opened",1537368289));if((saved_pref == null))
{return cljs.core.List.EMPTY;
} else
{return saved_pref;
}
})(),new cljs.core.Keyword(null,"messages","messages",551810238),cljs.core.PersistentVector.EMPTY], null));
cljs.core.add_watch.call(null,cmd.core.state,new cljs.core.Keyword(null,"pinned-gists","pinned-gists",1364707149),(function (key,ref,old_state,new_state){cmd.core.set_prefs.call(null,new cljs.core.Keyword(null,"pinned-gists","pinned-gists",1364707149),new_state.call(null,new cljs.core.Keyword(null,"pinned-gists","pinned-gists",1364707149)));
return cmd.core.set_prefs.call(null,new cljs.core.Keyword(null,"latest-opened","latest-opened",1537368289),new_state.call(null,new cljs.core.Keyword(null,"latest-opened","latest-opened",1537368289)));
}));
cmd.core.AppBus = cljs.core.async.chan.call(null,1);
cmd.core.set_state = (function set_state(state,key,new_state){return cljs.core.swap_BANG_.call(null,state,cljs.core.assoc,key,new_state);
});
cmd.core.reset_state = (function reset_state(state){return cljs.core.swap_BANG_.call(null,state,cljs.core.select_keys,new cljs.core.PersistentVector(null, 4, 5, cljs.core.PersistentVector.EMPTY_NODE, [new cljs.core.Keyword(null,"ace","ace",1014000629),new cljs.core.Keyword(null,"worker","worker",4526786288),new cljs.core.Keyword(null,"motd","motd",1017261828),new cljs.core.Keyword(null,"active-requests","active-requests",3616398877)], null));
});
cmd.core.get_state = (function get_state(state,key){return key.call(null,cljs.core.deref.call(null,state));
});
cmd.core.say = (function say(msg){cmd.core.set_state.call(null,cmd.core.state,new cljs.core.Keyword(null,"messages","messages",551810238),cljs.core.conj.call(null,cmd.core.get_state.call(null,cmd.core.state,new cljs.core.Keyword(null,"messages","messages",551810238)),msg));
var c__6728__auto___11169 = cljs.core.async.chan.call(null,1);cljs.core.async.impl.dispatch.run.call(null,((function (c__6728__auto___11169){
return (function (){var f__6729__auto__ = (function (){var switch__6713__auto__ = ((function (c__6728__auto___11169){
return (function (state_11160){var state_val_11161 = (state_11160[1]);if((state_val_11161 === 2))
{var inst_11158 = (state_11160[2]);var state_11160__$1 = state_11160;return cljs.core.async.impl.ioc_helpers.return_chan.call(null,state_11160__$1,inst_11158);
} else
{if((state_val_11161 === 1))
{var inst_11155 = [new cljs.core.Keyword(null,"new-console-msg","new-console-msg",3153444048),msg];var inst_11156 = (new cljs.core.PersistentVector(null,2,5,cljs.core.PersistentVector.EMPTY_NODE,inst_11155,null));var state_11160__$1 = state_11160;return cljs.core.async.impl.ioc_helpers.put_BANG_.call(null,state_11160__$1,2,cmd.core.AppBus,inst_11156);
} else
{return null;
}
}
});})(c__6728__auto___11169))
;return ((function (switch__6713__auto__,c__6728__auto___11169){
return (function() {
var state_machine__6714__auto__ = null;
var state_machine__6714__auto____0 = (function (){var statearr_11165 = [null,null,null,null,null,null,null];(statearr_11165[0] = state_machine__6714__auto__);
(statearr_11165[1] = 1);
return statearr_11165;
});
var state_machine__6714__auto____1 = (function (state_11160){while(true){
var ret_value__6715__auto__ = (function (){try{while(true){
var result__6716__auto__ = switch__6713__auto__.call(null,state_11160);if(cljs.core.keyword_identical_QMARK_.call(null,result__6716__auto__,new cljs.core.Keyword(null,"recur","recur",1122293407)))
{{
continue;
}
} else
{return result__6716__auto__;
}
break;
}
}catch (e11166){if((e11166 instanceof Object))
{var ex__6717__auto__ = e11166;var statearr_11167_11170 = state_11160;(statearr_11167_11170[5] = ex__6717__auto__);
cljs.core.async.impl.ioc_helpers.process_exception.call(null,state_11160);
return new cljs.core.Keyword(null,"recur","recur",1122293407);
} else
{if(new cljs.core.Keyword(null,"else","else",1017020587))
{throw e11166;
} else
{return null;
}
}
}})();if(cljs.core.keyword_identical_QMARK_.call(null,ret_value__6715__auto__,new cljs.core.Keyword(null,"recur","recur",1122293407)))
{{
var G__11171 = state_11160;
state_11160 = G__11171;
continue;
}
} else
{return ret_value__6715__auto__;
}
break;
}
});
state_machine__6714__auto__ = function(state_11160){
switch(arguments.length){
case 0:
return state_machine__6714__auto____0.call(this);
case 1:
return state_machine__6714__auto____1.call(this,state_11160);
}
throw(new Error('Invalid arity: ' + arguments.length));
};
state_machine__6714__auto__.cljs$core$IFn$_invoke$arity$0 = state_machine__6714__auto____0;
state_machine__6714__auto__.cljs$core$IFn$_invoke$arity$1 = state_machine__6714__auto____1;
return state_machine__6714__auto__;
})()
;})(switch__6713__auto__,c__6728__auto___11169))
})();var state__6730__auto__ = (function (){var statearr_11168 = f__6729__auto__.call(null);(statearr_11168[cljs.core.async.impl.ioc_helpers.USER_START_IDX] = c__6728__auto___11169);
return statearr_11168;
})();return cljs.core.async.impl.ioc_helpers.run_state_machine_wrapped.call(null,state__6730__auto__);
});})(c__6728__auto___11169))
);
return console.log(msg);
});
cljs.core.add_watch.call(null,cmd.lib.active_requests,null,(function (key,ref,old,new$){return cmd.core.set_state.call(null,cmd.core.state,new cljs.core.Keyword(null,"active-requests","active-requests",3616398877),new$);
}));
cmd.core.wmd__GT_html = (function wmd__GT_html(text){var worker = cmd.core.get_state.call(null,cmd.core.state,new cljs.core.Keyword(null,"worker","worker",4526786288));var text_mode = cmd.core.get_state.call(null,cmd.core.state,new cljs.core.Keyword(null,"text-mode","text-mode",4224925109));var ch = cljs.core.async.chan.call(null,1);worker.addEventListener("message",((function (worker,text_mode,ch){
return (function (e){var data = e.data;var c__6728__auto__ = cljs.core.async.chan.call(null,1);cljs.core.async.impl.dispatch.run.call(null,((function (c__6728__auto__,data,worker,text_mode,ch){
return (function (){var f__6729__auto__ = (function (){var switch__6713__auto__ = ((function (c__6728__auto__,data,worker,text_mode,ch){
return (function (state_11194){var state_val_11195 = (state_11194[1]);if((state_val_11195 === 2))
{var inst_11191 = (state_11194[2]);var inst_11192 = cljs.core.async.close_BANG_.call(null,ch);var state_11194__$1 = (function (){var statearr_11196 = state_11194;(statearr_11196[7] = inst_11191);
return statearr_11196;
})();return cljs.core.async.impl.ioc_helpers.return_chan.call(null,state_11194__$1,inst_11192);
} else
{if((state_val_11195 === 1))
{var inst_11188 = [new cljs.core.Keyword(null,"just","just",1017178206),data];var inst_11189 = (new cljs.core.PersistentVector(null,2,5,cljs.core.PersistentVector.EMPTY_NODE,inst_11188,null));var state_11194__$1 = state_11194;return cljs.core.async.impl.ioc_helpers.put_BANG_.call(null,state_11194__$1,2,ch,inst_11189);
} else
{return null;
}
}
});})(c__6728__auto__,data,worker,text_mode,ch))
;return ((function (switch__6713__auto__,c__6728__auto__,data,worker,text_mode,ch){
return (function() {
var state_machine__6714__auto__ = null;
var state_machine__6714__auto____0 = (function (){var statearr_11200 = [null,null,null,null,null,null,null,null];(statearr_11200[0] = state_machine__6714__auto__);
(statearr_11200[1] = 1);
return statearr_11200;
});
var state_machine__6714__auto____1 = (function (state_11194){while(true){
var ret_value__6715__auto__ = (function (){try{while(true){
var result__6716__auto__ = switch__6713__auto__.call(null,state_11194);if(cljs.core.keyword_identical_QMARK_.call(null,result__6716__auto__,new cljs.core.Keyword(null,"recur","recur",1122293407)))
{{
continue;
}
} else
{return result__6716__auto__;
}
break;
}
}catch (e11201){if((e11201 instanceof Object))
{var ex__6717__auto__ = e11201;var statearr_11202_11204 = state_11194;(statearr_11202_11204[5] = ex__6717__auto__);
cljs.core.async.impl.ioc_helpers.process_exception.call(null,state_11194);
return new cljs.core.Keyword(null,"recur","recur",1122293407);
} else
{if(new cljs.core.Keyword(null,"else","else",1017020587))
{throw e11201;
} else
{return null;
}
}
}})();if(cljs.core.keyword_identical_QMARK_.call(null,ret_value__6715__auto__,new cljs.core.Keyword(null,"recur","recur",1122293407)))
{{
var G__11205 = state_11194;
state_11194 = G__11205;
continue;
}
} else
{return ret_value__6715__auto__;
}
break;
}
});
state_machine__6714__auto__ = function(state_11194){
switch(arguments.length){
case 0:
return state_machine__6714__auto____0.call(this);
case 1:
return state_machine__6714__auto____1.call(this,state_11194);
}
throw(new Error('Invalid arity: ' + arguments.length));
};
state_machine__6714__auto__.cljs$core$IFn$_invoke$arity$0 = state_machine__6714__auto____0;
state_machine__6714__auto__.cljs$core$IFn$_invoke$arity$1 = state_machine__6714__auto____1;
return state_machine__6714__auto__;
})()
;})(switch__6713__auto__,c__6728__auto__,data,worker,text_mode,ch))
})();var state__6730__auto__ = (function (){var statearr_11203 = f__6729__auto__.call(null);(statearr_11203[cljs.core.async.impl.ioc_helpers.USER_START_IDX] = c__6728__auto__);
return statearr_11203;
})();return cljs.core.async.impl.ioc_helpers.run_state_machine_wrapped.call(null,state__6730__auto__);
});})(c__6728__auto__,data,worker,text_mode,ch))
);
return c__6728__auto__;
});})(worker,text_mode,ch))
,false);
worker.postMessage({"data": text, "mode": text_mode});
return ch;
});
cmd.core.html__GT_react = (function html__GT_react(html){return html;
});
cmd.core.process = (function process__$1(md){return cmd.core.wmd__GT_html.call(null,md);
});
cmd.core.make_basic_auth_token = (function make_basic_auth_token(username,password){return btoa([cljs.core.str(username),cljs.core.str(":"),cljs.core.str(password)].join(''));
});
cmd.core.auth_param_strict = (function auth_param_strict(username,auth_token){var obj11209 = {"Authorization":[cljs.core.str("Basic "),cljs.core.str(cmd.core.make_basic_auth_token.call(null,username,auth_token))].join(''),"Content-Type":"application/json"};return obj11209;
});
cmd.core.auth_param_anon = (function auth_param_anon(){var obj11213 = {"Content-Type":"application/json"};return obj11213;
});
cmd.core.auth_param_fallback = (function auth_param_fallback(username,auth_token){if((auth_token == null))
{return cmd.core.auth_param_anon.call(null);
} else
{return cmd.core.auth_param_strict.call(null,username,auth_token);
}
});
cmd.core.find_gist = (function find_gist(state,gist_id){return cljs.core.filter.call(null,(function (p1__11214_SHARP_){return cljs.core._EQ_.call(null,gist_id,p1__11214_SHARP_.call(null,"id"));
}),cmd.core.get_state.call(null,state,new cljs.core.Keyword(null,"gists","gists",1112269186)));
});
cmd.core.handle_io_error = (function handle_io_error(resp){var error_msg = resp.call(null,"message");cmd.core.set_state.call(null,cmd.core.state,new cljs.core.Keyword(null,"error","error",1110689146),error_msg);
return cmd.core.say.call(null,[cljs.core.str("All of a sudden... an IO Error: "),cljs.core.str(error_msg)].join(''));
});
cmd.core.load_gists = (function load_gists(){var c__6728__auto__ = cljs.core.async.chan.call(null,1);cljs.core.async.impl.dispatch.run.call(null,((function (c__6728__auto__){
return (function (){var f__6729__auto__ = (function (){var switch__6713__auto__ = ((function (c__6728__auto__){
return (function (state_11277){var state_val_11278 = (state_11277[1]);if((state_val_11278 === 6))
{var inst_11264 = (state_11277[7]);var inst_11272 = cmd.core.handle_io_error.call(null,inst_11264);var state_11277__$1 = state_11277;var statearr_11279_11293 = state_11277__$1;(statearr_11279_11293[2] = inst_11272);
(statearr_11279_11293[1] = 3);
return new cljs.core.Keyword(null,"recur","recur",1122293407);
} else
{if((state_val_11278 === 5))
{var inst_11265 = (state_11277[8]);var inst_11269 = (state_11277[2]);var inst_11270 = inst_11265.call(null,inst_11269);var state_11277__$1 = state_11277;var statearr_11280_11294 = state_11277__$1;(statearr_11280_11294[2] = inst_11270);
(statearr_11280_11294[1] = 3);
return new cljs.core.Keyword(null,"recur","recur",1122293407);
} else
{if((state_val_11278 === 4))
{var inst_11264 = (state_11277[7]);var inst_11265 = cmd.core.set_state.call(null,cmd.core.state,new cljs.core.Keyword(null,"gists","gists",1112269186),inst_11264);var inst_11266 = [new cljs.core.Keyword(null,"gists-loaded","gists-loaded",4427787732),null];var inst_11267 = (new cljs.core.PersistentVector(null,2,5,cljs.core.PersistentVector.EMPTY_NODE,inst_11266,null));var state_11277__$1 = (function (){var statearr_11281 = state_11277;(statearr_11281[8] = inst_11265);
return statearr_11281;
})();return cljs.core.async.impl.ioc_helpers.put_BANG_.call(null,state_11277__$1,5,cmd.core.AppBus,inst_11267);
} else
{if((state_val_11278 === 3))
{var inst_11275 = (state_11277[2]);var state_11277__$1 = state_11277;return cljs.core.async.impl.ioc_helpers.return_chan.call(null,state_11277__$1,inst_11275);
} else
{if((state_val_11278 === 2))
{var inst_11261 = (state_11277[2]);var inst_11262 = cljs.core.nth.call(null,inst_11261,0,null);var inst_11263 = cljs.core.nth.call(null,inst_11261,1,null);var inst_11264 = cmd.utils.raw__GT_clj.call(null,inst_11263);var state_11277__$1 = (function (){var statearr_11282 = state_11277;(statearr_11282[7] = inst_11264);
return statearr_11282;
})();var G__11283_11295 = inst_11262;if(cljs.core._EQ_.call(null,new cljs.core.Keyword(null,"nothing","nothing",3143228223),G__11283_11295))
{var statearr_11284_11296 = state_11277__$1;(statearr_11284_11296[1] = 6);
} else
{if(cljs.core._EQ_.call(null,new cljs.core.Keyword(null,"just","just",1017178206),G__11283_11295))
{var statearr_11285_11297 = state_11277__$1;(statearr_11285_11297[1] = 4);
} else
{if(new cljs.core.Keyword(null,"else","else",1017020587))
{throw (new Error([cljs.core.str("No matching clause: "),cljs.core.str(inst_11262)].join('')));
} else
{}
}
}
return new cljs.core.Keyword(null,"recur","recur",1122293407);
} else
{if((state_val_11278 === 1))
{var inst_11255 = cmd.core.get_state.call(null,cmd.core.state,new cljs.core.Keyword(null,"username","username",748190792));var inst_11256 = cmd.core.get_state.call(null,cmd.core.state,new cljs.core.Keyword(null,"auth-token","auth-token",1920647430));var inst_11257 = [cljs.core.str("/users/"),cljs.core.str(inst_11255),cljs.core.str("/gists")].join('');var inst_11258 = cmd.core.auth_param_fallback.call(null,inst_11255,inst_11256);var inst_11259 = cmd.lib.GET.call(null,inst_11257,inst_11258);var state_11277__$1 = state_11277;return cljs.core.async.impl.ioc_helpers.take_BANG_.call(null,state_11277__$1,2,inst_11259);
} else
{return null;
}
}
}
}
}
}
});})(c__6728__auto__))
;return ((function (switch__6713__auto__,c__6728__auto__){
return (function() {
var state_machine__6714__auto__ = null;
var state_machine__6714__auto____0 = (function (){var statearr_11289 = [null,null,null,null,null,null,null,null,null];(statearr_11289[0] = state_machine__6714__auto__);
(statearr_11289[1] = 1);
return statearr_11289;
});
var state_machine__6714__auto____1 = (function (state_11277){while(true){
var ret_value__6715__auto__ = (function (){try{while(true){
var result__6716__auto__ = switch__6713__auto__.call(null,state_11277);if(cljs.core.keyword_identical_QMARK_.call(null,result__6716__auto__,new cljs.core.Keyword(null,"recur","recur",1122293407)))
{{
continue;
}
} else
{return result__6716__auto__;
}
break;
}
}catch (e11290){if((e11290 instanceof Object))
{var ex__6717__auto__ = e11290;var statearr_11291_11298 = state_11277;(statearr_11291_11298[5] = ex__6717__auto__);
cljs.core.async.impl.ioc_helpers.process_exception.call(null,state_11277);
return new cljs.core.Keyword(null,"recur","recur",1122293407);
} else
{if(new cljs.core.Keyword(null,"else","else",1017020587))
{throw e11290;
} else
{return null;
}
}
}})();if(cljs.core.keyword_identical_QMARK_.call(null,ret_value__6715__auto__,new cljs.core.Keyword(null,"recur","recur",1122293407)))
{{
var G__11299 = state_11277;
state_11277 = G__11299;
continue;
}
} else
{return ret_value__6715__auto__;
}
break;
}
});
state_machine__6714__auto__ = function(state_11277){
switch(arguments.length){
case 0:
return state_machine__6714__auto____0.call(this);
case 1:
return state_machine__6714__auto____1.call(this,state_11277);
}
throw(new Error('Invalid arity: ' + arguments.length));
};
state_machine__6714__auto__.cljs$core$IFn$_invoke$arity$0 = state_machine__6714__auto____0;
state_machine__6714__auto__.cljs$core$IFn$_invoke$arity$1 = state_machine__6714__auto____1;
return state_machine__6714__auto__;
})()
;})(switch__6713__auto__,c__6728__auto__))
})();var state__6730__auto__ = (function (){var statearr_11292 = f__6729__auto__.call(null);(statearr_11292[cljs.core.async.impl.ioc_helpers.USER_START_IDX] = c__6728__auto__);
return statearr_11292;
})();return cljs.core.async.impl.ioc_helpers.run_state_machine_wrapped.call(null,state__6730__auto__);
});})(c__6728__auto__))
);
return c__6728__auto__;
});
cmd.core.update_latest_opened = (function update_latest_opened(gist_id){var latest_opened = cmd.core.get_state.call(null,cmd.core.state,new cljs.core.Keyword(null,"latest-opened","latest-opened",1537368289));var clean_opened = cljs.core.filter.call(null,((function (latest_opened){
return (function (p1__11300_SHARP_){return !(cljs.core._EQ_.call(null,p1__11300_SHARP_,gist_id));
});})(latest_opened))
,latest_opened);var new_latest_opened = cljs.core.take.call(null,20,cljs.core.conj.call(null,clean_opened,gist_id));return cmd.core.set_state.call(null,cmd.core.state,new cljs.core.Keyword(null,"latest-opened","latest-opened",1537368289),new_latest_opened);
});
cmd.core.get_motd = (function get_motd(gist_id){var c__6728__auto__ = cljs.core.async.chan.call(null,1);cljs.core.async.impl.dispatch.run.call(null,((function (c__6728__auto__){
return (function (){var f__6729__auto__ = (function (){var switch__6713__auto__ = ((function (c__6728__auto__){
return (function (state_11375){var state_val_11376 = (state_11375[1]);if((state_val_11376 === 6))
{var inst_11368 = cmd.core.set_state.call(null,cmd.core.state,new cljs.core.Keyword(null,"motd","motd",1017261828),cmd.defs.local_motd);var inst_11369 = cmd.core.say.call(null,"Sorry, can't load motd");var inst_11370 = inst_11368.call(null,inst_11369);var state_11375__$1 = state_11375;var statearr_11377_11391 = state_11375__$1;(statearr_11377_11391[2] = inst_11370);
(statearr_11377_11391[1] = 3);
return new cljs.core.Keyword(null,"recur","recur",1122293407);
} else
{if((state_val_11376 === 5))
{var inst_11361 = (state_11375[7]);var inst_11365 = (state_11375[2]);var inst_11366 = inst_11361.call(null,inst_11365);var state_11375__$1 = state_11375;var statearr_11378_11392 = state_11375__$1;(statearr_11378_11392[2] = inst_11366);
(statearr_11378_11392[1] = 3);
return new cljs.core.Keyword(null,"recur","recur",1122293407);
} else
{if((state_val_11376 === 4))
{var inst_11353 = (state_11375[8]);var inst_11355 = cmd.utils.raw__GT_clj.call(null,inst_11353);var inst_11356 = inst_11355.call(null,"files");var inst_11357 = cljs.core.first.call(null,inst_11356);var inst_11358 = cljs.core.nth.call(null,inst_11357,0,null);var inst_11359 = cljs.core.nth.call(null,inst_11357,1,null);var inst_11360 = inst_11359.call(null,"content");var inst_11361 = cmd.core.set_state.call(null,cmd.core.state,new cljs.core.Keyword(null,"motd","motd",1017261828),inst_11360);var inst_11362 = [new cljs.core.Keyword(null,"motd-loaded","motd-loaded",1538034194),inst_11360];var inst_11363 = (new cljs.core.PersistentVector(null,2,5,cljs.core.PersistentVector.EMPTY_NODE,inst_11362,null));var state_11375__$1 = (function (){var statearr_11379 = state_11375;(statearr_11379[9] = inst_11358);
(statearr_11379[7] = inst_11361);
return statearr_11379;
})();return cljs.core.async.impl.ioc_helpers.put_BANG_.call(null,state_11375__$1,5,cmd.core.AppBus,inst_11363);
} else
{if((state_val_11376 === 3))
{var inst_11373 = (state_11375[2]);var state_11375__$1 = state_11375;return cljs.core.async.impl.ioc_helpers.return_chan.call(null,state_11375__$1,inst_11373);
} else
{if((state_val_11376 === 2))
{var inst_11351 = (state_11375[2]);var inst_11352 = cljs.core.nth.call(null,inst_11351,0,null);var inst_11353 = cljs.core.nth.call(null,inst_11351,1,null);var state_11375__$1 = (function (){var statearr_11380 = state_11375;(statearr_11380[8] = inst_11353);
return statearr_11380;
})();var G__11381_11393 = inst_11352;if(cljs.core._EQ_.call(null,new cljs.core.Keyword(null,"nothing","nothing",3143228223),G__11381_11393))
{var statearr_11382_11394 = state_11375__$1;(statearr_11382_11394[1] = 6);
} else
{if(cljs.core._EQ_.call(null,new cljs.core.Keyword(null,"just","just",1017178206),G__11381_11393))
{var statearr_11383_11395 = state_11375__$1;(statearr_11383_11395[1] = 4);
} else
{if(new cljs.core.Keyword(null,"else","else",1017020587))
{throw (new Error([cljs.core.str("No matching clause: "),cljs.core.str(inst_11352)].join('')));
} else
{}
}
}
return new cljs.core.Keyword(null,"recur","recur",1122293407);
} else
{if((state_val_11376 === 1))
{var inst_11347 = [cljs.core.str("/gists/"),cljs.core.str(gist_id)].join('');var inst_11348 = cmd.core.auth_param_anon.call(null);var inst_11349 = cmd.lib.GET.call(null,inst_11347,inst_11348);var state_11375__$1 = state_11375;return cljs.core.async.impl.ioc_helpers.take_BANG_.call(null,state_11375__$1,2,inst_11349);
} else
{return null;
}
}
}
}
}
}
});})(c__6728__auto__))
;return ((function (switch__6713__auto__,c__6728__auto__){
return (function() {
var state_machine__6714__auto__ = null;
var state_machine__6714__auto____0 = (function (){var statearr_11387 = [null,null,null,null,null,null,null,null,null,null];(statearr_11387[0] = state_machine__6714__auto__);
(statearr_11387[1] = 1);
return statearr_11387;
});
var state_machine__6714__auto____1 = (function (state_11375){while(true){
var ret_value__6715__auto__ = (function (){try{while(true){
var result__6716__auto__ = switch__6713__auto__.call(null,state_11375);if(cljs.core.keyword_identical_QMARK_.call(null,result__6716__auto__,new cljs.core.Keyword(null,"recur","recur",1122293407)))
{{
continue;
}
} else
{return result__6716__auto__;
}
break;
}
}catch (e11388){if((e11388 instanceof Object))
{var ex__6717__auto__ = e11388;var statearr_11389_11396 = state_11375;(statearr_11389_11396[5] = ex__6717__auto__);
cljs.core.async.impl.ioc_helpers.process_exception.call(null,state_11375);
return new cljs.core.Keyword(null,"recur","recur",1122293407);
} else
{if(new cljs.core.Keyword(null,"else","else",1017020587))
{throw e11388;
} else
{return null;
}
}
}})();if(cljs.core.keyword_identical_QMARK_.call(null,ret_value__6715__auto__,new cljs.core.Keyword(null,"recur","recur",1122293407)))
{{
var G__11397 = state_11375;
state_11375 = G__11397;
continue;
}
} else
{return ret_value__6715__auto__;
}
break;
}
});
state_machine__6714__auto__ = function(state_11375){
switch(arguments.length){
case 0:
return state_machine__6714__auto____0.call(this);
case 1:
return state_machine__6714__auto____1.call(this,state_11375);
}
throw(new Error('Invalid arity: ' + arguments.length));
};
state_machine__6714__auto__.cljs$core$IFn$_invoke$arity$0 = state_machine__6714__auto____0;
state_machine__6714__auto__.cljs$core$IFn$_invoke$arity$1 = state_machine__6714__auto____1;
return state_machine__6714__auto__;
})()
;})(switch__6713__auto__,c__6728__auto__))
})();var state__6730__auto__ = (function (){var statearr_11390 = f__6729__auto__.call(null);(statearr_11390[cljs.core.async.impl.ioc_helpers.USER_START_IDX] = c__6728__auto__);
return statearr_11390;
})();return cljs.core.async.impl.ioc_helpers.run_state_machine_wrapped.call(null,state__6730__auto__);
});})(c__6728__auto__))
);
return c__6728__auto__;
});
cmd.core.guess_file_mode = (function guess_file_mode(filename){var ext = cljs.core.re_find.call(null,/\.[A-Za-z0-9]+?$/,filename);var G__11399 = ext;if(cljs.core._EQ_.call(null,null,G__11399))
{return null;
} else
{if(new cljs.core.Keyword(null,"else","else",1017020587))
{return ext.toLowerCase();
} else
{return null;
}
}
});
cmd.core.load_gist = (function load_gist(id){var c__6728__auto__ = cljs.core.async.chan.call(null,1);cljs.core.async.impl.dispatch.run.call(null,((function (c__6728__auto__){
return (function (){var f__6729__auto__ = (function (){var switch__6713__auto__ = ((function (c__6728__auto__){
return (function (state_11484){var state_val_11485 = (state_11484[1]);if((state_val_11485 === 6))
{var inst_11459 = (state_11484[7]);var inst_11478 = cmd.utils.raw__GT_clj.call(null,inst_11459);var inst_11479 = cmd.core.handle_io_error.call(null,inst_11478);var state_11484__$1 = state_11484;var statearr_11486_11500 = state_11484__$1;(statearr_11486_11500[2] = inst_11479);
(statearr_11486_11500[1] = 3);
return new cljs.core.Keyword(null,"recur","recur",1122293407);
} else
{if((state_val_11485 === 5))
{var inst_11476 = (state_11484[2]);var state_11484__$1 = state_11484;var statearr_11487_11501 = state_11484__$1;(statearr_11487_11501[2] = inst_11476);
(statearr_11487_11501[1] = 3);
return new cljs.core.Keyword(null,"recur","recur",1122293407);
} else
{if((state_val_11485 === 4))
{var inst_11459 = (state_11484[7]);var inst_11461 = cmd.utils.raw__GT_clj.call(null,inst_11459);var inst_11462 = inst_11461.call(null,"files");var inst_11463 = cljs.core.first.call(null,inst_11462);var inst_11464 = cljs.core.nth.call(null,inst_11463,0,null);var inst_11465 = cljs.core.nth.call(null,inst_11463,1,null);var inst_11466 = cmd.core.guess_file_mode.call(null,inst_11464);var inst_11467 = cmd.core.set_state.call(null,cmd.core.state,new cljs.core.Keyword(null,"current-file-id","current-file-id",3464759850),inst_11464);var inst_11468 = cmd.core.set_state.call(null,cmd.core.state,new cljs.core.Keyword(null,"text-mode","text-mode",4224925109),inst_11466);var inst_11469 = cmd.core.set_state.call(null,cmd.core.state,new cljs.core.Keyword(null,"current-gist","current-gist",2436253193),inst_11461);var inst_11470 = cmd.core.set_state.call(null,cmd.core.state,new cljs.core.Keyword(null,"current-gist-id","current-gist-id",4359175043),id);var inst_11471 = cmd.core.set_state.call(null,cmd.core.state,new cljs.core.Keyword(null,"mode","mode",1017261333),new cljs.core.Keyword(null,"edit-gist","edit-gist",3396290584));var inst_11472 = cmd.core.update_latest_opened.call(null,id);var inst_11473 = [new cljs.core.Keyword(null,"gist-loaded","gist-loaded",4536537537),id];var inst_11474 = (new cljs.core.PersistentVector(null,2,5,cljs.core.PersistentVector.EMPTY_NODE,inst_11473,null));var state_11484__$1 = (function (){var statearr_11488 = state_11484;(statearr_11488[8] = inst_11469);
(statearr_11488[9] = inst_11472);
(statearr_11488[10] = inst_11471);
(statearr_11488[11] = inst_11470);
(statearr_11488[12] = inst_11465);
(statearr_11488[13] = inst_11468);
(statearr_11488[14] = inst_11467);
return statearr_11488;
})();return cljs.core.async.impl.ioc_helpers.put_BANG_.call(null,state_11484__$1,5,cmd.core.AppBus,inst_11474);
} else
{if((state_val_11485 === 3))
{var inst_11482 = (state_11484[2]);var state_11484__$1 = state_11484;return cljs.core.async.impl.ioc_helpers.return_chan.call(null,state_11484__$1,inst_11482);
} else
{if((state_val_11485 === 2))
{var inst_11457 = (state_11484[2]);var inst_11458 = cljs.core.nth.call(null,inst_11457,0,null);var inst_11459 = cljs.core.nth.call(null,inst_11457,1,null);var state_11484__$1 = (function (){var statearr_11489 = state_11484;(statearr_11489[7] = inst_11459);
return statearr_11489;
})();var G__11490_11502 = inst_11458;if(cljs.core._EQ_.call(null,new cljs.core.Keyword(null,"nothing","nothing",3143228223),G__11490_11502))
{var statearr_11491_11503 = state_11484__$1;(statearr_11491_11503[1] = 6);
} else
{if(cljs.core._EQ_.call(null,new cljs.core.Keyword(null,"just","just",1017178206),G__11490_11502))
{var statearr_11492_11504 = state_11484__$1;(statearr_11492_11504[1] = 4);
} else
{if(new cljs.core.Keyword(null,"else","else",1017020587))
{throw (new Error([cljs.core.str("No matching clause: "),cljs.core.str(inst_11458)].join('')));
} else
{}
}
}
return new cljs.core.Keyword(null,"recur","recur",1122293407);
} else
{if((state_val_11485 === 1))
{var inst_11451 = [cljs.core.str("/gists/"),cljs.core.str(id)].join('');var inst_11452 = cmd.core.get_state.call(null,cmd.core.state,new cljs.core.Keyword(null,"username","username",748190792));var inst_11453 = cmd.core.get_state.call(null,cmd.core.state,new cljs.core.Keyword(null,"auth-token","auth-token",1920647430));var inst_11454 = cmd.core.auth_param_fallback.call(null,inst_11452,inst_11453);var inst_11455 = cmd.lib.GET.call(null,inst_11451,inst_11454);var state_11484__$1 = state_11484;return cljs.core.async.impl.ioc_helpers.take_BANG_.call(null,state_11484__$1,2,inst_11455);
} else
{return null;
}
}
}
}
}
}
});})(c__6728__auto__))
;return ((function (switch__6713__auto__,c__6728__auto__){
return (function() {
var state_machine__6714__auto__ = null;
var state_machine__6714__auto____0 = (function (){var statearr_11496 = [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null];(statearr_11496[0] = state_machine__6714__auto__);
(statearr_11496[1] = 1);
return statearr_11496;
});
var state_machine__6714__auto____1 = (function (state_11484){while(true){
var ret_value__6715__auto__ = (function (){try{while(true){
var result__6716__auto__ = switch__6713__auto__.call(null,state_11484);if(cljs.core.keyword_identical_QMARK_.call(null,result__6716__auto__,new cljs.core.Keyword(null,"recur","recur",1122293407)))
{{
continue;
}
} else
{return result__6716__auto__;
}
break;
}
}catch (e11497){if((e11497 instanceof Object))
{var ex__6717__auto__ = e11497;var statearr_11498_11505 = state_11484;(statearr_11498_11505[5] = ex__6717__auto__);
cljs.core.async.impl.ioc_helpers.process_exception.call(null,state_11484);
return new cljs.core.Keyword(null,"recur","recur",1122293407);
} else
{if(new cljs.core.Keyword(null,"else","else",1017020587))
{throw e11497;
} else
{return null;
}
}
}})();if(cljs.core.keyword_identical_QMARK_.call(null,ret_value__6715__auto__,new cljs.core.Keyword(null,"recur","recur",1122293407)))
{{
var G__11506 = state_11484;
state_11484 = G__11506;
continue;
}
} else
{return ret_value__6715__auto__;
}
break;
}
});
state_machine__6714__auto__ = function(state_11484){
switch(arguments.length){
case 0:
return state_machine__6714__auto____0.call(this);
case 1:
return state_machine__6714__auto____1.call(this,state_11484);
}
throw(new Error('Invalid arity: ' + arguments.length));
};
state_machine__6714__auto__.cljs$core$IFn$_invoke$arity$0 = state_machine__6714__auto____0;
state_machine__6714__auto__.cljs$core$IFn$_invoke$arity$1 = state_machine__6714__auto____1;
return state_machine__6714__auto__;
})()
;})(switch__6713__auto__,c__6728__auto__))
})();var state__6730__auto__ = (function (){var statearr_11499 = f__6729__auto__.call(null);(statearr_11499[cljs.core.async.impl.ioc_helpers.USER_START_IDX] = c__6728__auto__);
return statearr_11499;
})();return cljs.core.async.impl.ioc_helpers.run_state_machine_wrapped.call(null,state__6730__auto__);
});})(c__6728__auto__))
);
return c__6728__auto__;
});
cmd.core.save_gist = (function save_gist(gist_id,new_content){var c__6728__auto__ = cljs.core.async.chan.call(null,1);cljs.core.async.impl.dispatch.run.call(null,((function (c__6728__auto__){
return (function (){var f__6729__auto__ = (function (){var switch__6713__auto__ = ((function (c__6728__auto__){
return (function (state_11565){var state_val_11566 = (state_11565[1]);if((state_val_11566 === 5))
{var inst_11554 = (state_11565[7]);var inst_11560 = cmd.core.handle_io_error.call(null,inst_11554);var state_11565__$1 = state_11565;var statearr_11567_11581 = state_11565__$1;(statearr_11567_11581[2] = inst_11560);
(statearr_11567_11581[1] = 3);
return new cljs.core.Keyword(null,"recur","recur",1122293407);
} else
{if((state_val_11566 === 4))
{var inst_11554 = (state_11565[7]);var inst_11555 = cmd.core.set_state.call(null,cmd.core.state,new cljs.core.Keyword(null,"current-gist","current-gist",2436253193),inst_11554);var inst_11556 = cmd.core.load_gists.call(null);var inst_11557 = [cljs.core.str("Ok, gist "),cljs.core.str(gist_id),cljs.core.str(" saved")].join('');var inst_11558 = cmd.core.say.call(null,inst_11557);var state_11565__$1 = (function (){var statearr_11568 = state_11565;(statearr_11568[8] = inst_11556);
(statearr_11568[9] = inst_11555);
return statearr_11568;
})();var statearr_11569_11582 = state_11565__$1;(statearr_11569_11582[2] = inst_11558);
(statearr_11569_11582[1] = 3);
return new cljs.core.Keyword(null,"recur","recur",1122293407);
} else
{if((state_val_11566 === 3))
{var inst_11563 = (state_11565[2]);var state_11565__$1 = state_11565;return cljs.core.async.impl.ioc_helpers.return_chan.call(null,state_11565__$1,inst_11563);
} else
{if((state_val_11566 === 2))
{var inst_11551 = (state_11565[2]);var inst_11552 = cljs.core.nth.call(null,inst_11551,0,null);var inst_11553 = cljs.core.nth.call(null,inst_11551,1,null);var inst_11554 = cmd.utils.raw__GT_clj.call(null,inst_11553);var state_11565__$1 = (function (){var statearr_11570 = state_11565;(statearr_11570[7] = inst_11554);
return statearr_11570;
})();var G__11571_11583 = inst_11552;if(cljs.core._EQ_.call(null,new cljs.core.Keyword(null,"nothing","nothing",3143228223),G__11571_11583))
{var statearr_11572_11584 = state_11565__$1;(statearr_11572_11584[1] = 5);
} else
{if(cljs.core._EQ_.call(null,new cljs.core.Keyword(null,"just","just",1017178206),G__11571_11583))
{var statearr_11573_11585 = state_11565__$1;(statearr_11573_11585[1] = 4);
} else
{if(new cljs.core.Keyword(null,"else","else",1017020587))
{throw (new Error([cljs.core.str("No matching clause: "),cljs.core.str(inst_11552)].join('')));
} else
{}
}
}
return new cljs.core.Keyword(null,"recur","recur",1122293407);
} else
{if((state_val_11566 === 1))
{var inst_11545 = [cljs.core.str("/gists/"),cljs.core.str(gist_id)].join('');var inst_11546 = cmd.core.get_state.call(null,cmd.core.state,new cljs.core.Keyword(null,"username","username",748190792));var inst_11547 = cmd.core.get_state.call(null,cmd.core.state,new cljs.core.Keyword(null,"auth-token","auth-token",1920647430));var inst_11548 = cmd.core.auth_param_strict.call(null,inst_11546,inst_11547);var inst_11549 = cmd.lib.PATCH.call(null,inst_11545,new_content,inst_11548);var state_11565__$1 = state_11565;return cljs.core.async.impl.ioc_helpers.take_BANG_.call(null,state_11565__$1,2,inst_11549);
} else
{return null;
}
}
}
}
}
});})(c__6728__auto__))
;return ((function (switch__6713__auto__,c__6728__auto__){
return (function() {
var state_machine__6714__auto__ = null;
var state_machine__6714__auto____0 = (function (){var statearr_11577 = [null,null,null,null,null,null,null,null,null,null];(statearr_11577[0] = state_machine__6714__auto__);
(statearr_11577[1] = 1);
return statearr_11577;
});
var state_machine__6714__auto____1 = (function (state_11565){while(true){
var ret_value__6715__auto__ = (function (){try{while(true){
var result__6716__auto__ = switch__6713__auto__.call(null,state_11565);if(cljs.core.keyword_identical_QMARK_.call(null,result__6716__auto__,new cljs.core.Keyword(null,"recur","recur",1122293407)))
{{
continue;
}
} else
{return result__6716__auto__;
}
break;
}
}catch (e11578){if((e11578 instanceof Object))
{var ex__6717__auto__ = e11578;var statearr_11579_11586 = state_11565;(statearr_11579_11586[5] = ex__6717__auto__);
cljs.core.async.impl.ioc_helpers.process_exception.call(null,state_11565);
return new cljs.core.Keyword(null,"recur","recur",1122293407);
} else
{if(new cljs.core.Keyword(null,"else","else",1017020587))
{throw e11578;
} else
{return null;
}
}
}})();if(cljs.core.keyword_identical_QMARK_.call(null,ret_value__6715__auto__,new cljs.core.Keyword(null,"recur","recur",1122293407)))
{{
var G__11587 = state_11565;
state_11565 = G__11587;
continue;
}
} else
{return ret_value__6715__auto__;
}
break;
}
});
state_machine__6714__auto__ = function(state_11565){
switch(arguments.length){
case 0:
return state_machine__6714__auto____0.call(this);
case 1:
return state_machine__6714__auto____1.call(this,state_11565);
}
throw(new Error('Invalid arity: ' + arguments.length));
};
state_machine__6714__auto__.cljs$core$IFn$_invoke$arity$0 = state_machine__6714__auto____0;
state_machine__6714__auto__.cljs$core$IFn$_invoke$arity$1 = state_machine__6714__auto____1;
return state_machine__6714__auto__;
})()
;})(switch__6713__auto__,c__6728__auto__))
})();var state__6730__auto__ = (function (){var statearr_11580 = f__6729__auto__.call(null);(statearr_11580[cljs.core.async.impl.ioc_helpers.USER_START_IDX] = c__6728__auto__);
return statearr_11580;
})();return cljs.core.async.impl.ioc_helpers.run_state_machine_wrapped.call(null,state__6730__auto__);
});})(c__6728__auto__))
);
return c__6728__auto__;
});
cmd.core.create_gist = (function create_gist(new_content){var c__6728__auto__ = cljs.core.async.chan.call(null,1);cljs.core.async.impl.dispatch.run.call(null,((function (c__6728__auto__){
return (function (){var f__6729__auto__ = (function (){var switch__6713__auto__ = ((function (c__6728__auto__){
return (function (state_11648){var state_val_11649 = (state_11648[1]);if((state_val_11649 === 5))
{var inst_11635 = (state_11648[7]);var inst_11643 = cmd.core.handle_io_error.call(null,inst_11635);var state_11648__$1 = state_11648;var statearr_11650_11664 = state_11648__$1;(statearr_11650_11664[2] = inst_11643);
(statearr_11650_11664[1] = 3);
return new cljs.core.Keyword(null,"recur","recur",1122293407);
} else
{if((state_val_11649 === 4))
{var inst_11635 = (state_11648[7]);var inst_11636 = inst_11635.call(null,"id");var inst_11637 = cmd.core.set_state.call(null,cmd.core.state,new cljs.core.Keyword(null,"mode","mode",1017261333),null);var inst_11638 = cmd.core.load_gists.call(null);var inst_11639 = cmd.core.load_gist.call(null,inst_11636);var inst_11640 = [cljs.core.str("Ok, created a gist, got id "),cljs.core.str(inst_11636)].join('');var inst_11641 = cmd.core.say.call(null,inst_11640);var state_11648__$1 = (function (){var statearr_11651 = state_11648;(statearr_11651[8] = inst_11637);
(statearr_11651[9] = inst_11638);
(statearr_11651[10] = inst_11639);
return statearr_11651;
})();var statearr_11652_11665 = state_11648__$1;(statearr_11652_11665[2] = inst_11641);
(statearr_11652_11665[1] = 3);
return new cljs.core.Keyword(null,"recur","recur",1122293407);
} else
{if((state_val_11649 === 3))
{var inst_11646 = (state_11648[2]);var state_11648__$1 = state_11648;return cljs.core.async.impl.ioc_helpers.return_chan.call(null,state_11648__$1,inst_11646);
} else
{if((state_val_11649 === 2))
{var inst_11632 = (state_11648[2]);var inst_11633 = cljs.core.nth.call(null,inst_11632,0,null);var inst_11634 = cljs.core.nth.call(null,inst_11632,1,null);var inst_11635 = cmd.utils.raw__GT_clj.call(null,inst_11634);var state_11648__$1 = (function (){var statearr_11653 = state_11648;(statearr_11653[7] = inst_11635);
return statearr_11653;
})();var G__11654_11666 = inst_11633;if(cljs.core._EQ_.call(null,new cljs.core.Keyword(null,"nothing","nothing",3143228223),G__11654_11666))
{var statearr_11655_11667 = state_11648__$1;(statearr_11655_11667[1] = 5);
} else
{if(cljs.core._EQ_.call(null,new cljs.core.Keyword(null,"just","just",1017178206),G__11654_11666))
{var statearr_11656_11668 = state_11648__$1;(statearr_11656_11668[1] = 4);
} else
{if(new cljs.core.Keyword(null,"else","else",1017020587))
{throw (new Error([cljs.core.str("No matching clause: "),cljs.core.str(inst_11633)].join('')));
} else
{}
}
}
return new cljs.core.Keyword(null,"recur","recur",1122293407);
} else
{if((state_val_11649 === 1))
{var inst_11627 = cmd.core.get_state.call(null,cmd.core.state,new cljs.core.Keyword(null,"username","username",748190792));var inst_11628 = cmd.core.get_state.call(null,cmd.core.state,new cljs.core.Keyword(null,"auth-token","auth-token",1920647430));var inst_11629 = cmd.core.auth_param_strict.call(null,inst_11627,inst_11628);var inst_11630 = cmd.lib.POST.call(null,"/gists",new_content,inst_11629);var state_11648__$1 = state_11648;return cljs.core.async.impl.ioc_helpers.take_BANG_.call(null,state_11648__$1,2,inst_11630);
} else
{return null;
}
}
}
}
}
});})(c__6728__auto__))
;return ((function (switch__6713__auto__,c__6728__auto__){
return (function() {
var state_machine__6714__auto__ = null;
var state_machine__6714__auto____0 = (function (){var statearr_11660 = [null,null,null,null,null,null,null,null,null,null,null];(statearr_11660[0] = state_machine__6714__auto__);
(statearr_11660[1] = 1);
return statearr_11660;
});
var state_machine__6714__auto____1 = (function (state_11648){while(true){
var ret_value__6715__auto__ = (function (){try{while(true){
var result__6716__auto__ = switch__6713__auto__.call(null,state_11648);if(cljs.core.keyword_identical_QMARK_.call(null,result__6716__auto__,new cljs.core.Keyword(null,"recur","recur",1122293407)))
{{
continue;
}
} else
{return result__6716__auto__;
}
break;
}
}catch (e11661){if((e11661 instanceof Object))
{var ex__6717__auto__ = e11661;var statearr_11662_11669 = state_11648;(statearr_11662_11669[5] = ex__6717__auto__);
cljs.core.async.impl.ioc_helpers.process_exception.call(null,state_11648);
return new cljs.core.Keyword(null,"recur","recur",1122293407);
} else
{if(new cljs.core.Keyword(null,"else","else",1017020587))
{throw e11661;
} else
{return null;
}
}
}})();if(cljs.core.keyword_identical_QMARK_.call(null,ret_value__6715__auto__,new cljs.core.Keyword(null,"recur","recur",1122293407)))
{{
var G__11670 = state_11648;
state_11648 = G__11670;
continue;
}
} else
{return ret_value__6715__auto__;
}
break;
}
});
state_machine__6714__auto__ = function(state_11648){
switch(arguments.length){
case 0:
return state_machine__6714__auto____0.call(this);
case 1:
return state_machine__6714__auto____1.call(this,state_11648);
}
throw(new Error('Invalid arity: ' + arguments.length));
};
state_machine__6714__auto__.cljs$core$IFn$_invoke$arity$0 = state_machine__6714__auto____0;
state_machine__6714__auto__.cljs$core$IFn$_invoke$arity$1 = state_machine__6714__auto____1;
return state_machine__6714__auto__;
})()
;})(switch__6713__auto__,c__6728__auto__))
})();var state__6730__auto__ = (function (){var statearr_11663 = f__6729__auto__.call(null);(statearr_11663[cljs.core.async.impl.ioc_helpers.USER_START_IDX] = c__6728__auto__);
return statearr_11663;
})();return cljs.core.async.impl.ioc_helpers.run_state_machine_wrapped.call(null,state__6730__auto__);
});})(c__6728__auto__))
);
return c__6728__auto__;
});
cmd.core.logged_in = (function logged_in(username,auth_token){cmd.core.set_state.call(null,cmd.core.state,new cljs.core.Keyword(null,"username","username",748190792),username);
cmd.core.set_state.call(null,cmd.core.state,new cljs.core.Keyword(null,"auth-token","auth-token",1920647430),auth_token);
cmd.core.set_state.call(null,cmd.core.state,new cljs.core.Keyword(null,"valid-credentials","valid-credentials",4398423581),true);
cmd.core.set_prefs.call(null,"username",username);
cmd.core.set_prefs.call(null,"auth-token",auth_token);
var c__6728__auto__ = cljs.core.async.chan.call(null,1);cljs.core.async.impl.dispatch.run.call(null,((function (c__6728__auto__){
return (function (){var f__6729__auto__ = (function (){var switch__6713__auto__ = ((function (c__6728__auto__){
return (function (state_11690){var state_val_11691 = (state_11690[1]);if((state_val_11691 === 2))
{var inst_11688 = (state_11690[2]);var state_11690__$1 = state_11690;return cljs.core.async.impl.ioc_helpers.return_chan.call(null,state_11690__$1,inst_11688);
} else
{if((state_val_11691 === 1))
{var inst_11685 = [new cljs.core.Keyword(null,"user-is-authenticated","user-is-authenticated",3919945216),true];var inst_11686 = (new cljs.core.PersistentVector(null,2,5,cljs.core.PersistentVector.EMPTY_NODE,inst_11685,null));var state_11690__$1 = state_11690;return cljs.core.async.impl.ioc_helpers.put_BANG_.call(null,state_11690__$1,2,cmd.core.AppBus,inst_11686);
} else
{return null;
}
}
});})(c__6728__auto__))
;return ((function (switch__6713__auto__,c__6728__auto__){
return (function() {
var state_machine__6714__auto__ = null;
var state_machine__6714__auto____0 = (function (){var statearr_11695 = [null,null,null,null,null,null,null];(statearr_11695[0] = state_machine__6714__auto__);
(statearr_11695[1] = 1);
return statearr_11695;
});
var state_machine__6714__auto____1 = (function (state_11690){while(true){
var ret_value__6715__auto__ = (function (){try{while(true){
var result__6716__auto__ = switch__6713__auto__.call(null,state_11690);if(cljs.core.keyword_identical_QMARK_.call(null,result__6716__auto__,new cljs.core.Keyword(null,"recur","recur",1122293407)))
{{
continue;
}
} else
{return result__6716__auto__;
}
break;
}
}catch (e11696){if((e11696 instanceof Object))
{var ex__6717__auto__ = e11696;var statearr_11697_11699 = state_11690;(statearr_11697_11699[5] = ex__6717__auto__);
cljs.core.async.impl.ioc_helpers.process_exception.call(null,state_11690);
return new cljs.core.Keyword(null,"recur","recur",1122293407);
} else
{if(new cljs.core.Keyword(null,"else","else",1017020587))
{throw e11696;
} else
{return null;
}
}
}})();if(cljs.core.keyword_identical_QMARK_.call(null,ret_value__6715__auto__,new cljs.core.Keyword(null,"recur","recur",1122293407)))
{{
var G__11700 = state_11690;
state_11690 = G__11700;
continue;
}
} else
{return ret_value__6715__auto__;
}
break;
}
});
state_machine__6714__auto__ = function(state_11690){
switch(arguments.length){
case 0:
return state_machine__6714__auto____0.call(this);
case 1:
return state_machine__6714__auto____1.call(this,state_11690);
}
throw(new Error('Invalid arity: ' + arguments.length));
};
state_machine__6714__auto__.cljs$core$IFn$_invoke$arity$0 = state_machine__6714__auto____0;
state_machine__6714__auto__.cljs$core$IFn$_invoke$arity$1 = state_machine__6714__auto____1;
return state_machine__6714__auto__;
})()
;})(switch__6713__auto__,c__6728__auto__))
})();var state__6730__auto__ = (function (){var statearr_11698 = f__6729__auto__.call(null);(statearr_11698[cljs.core.async.impl.ioc_helpers.USER_START_IDX] = c__6728__auto__);
return statearr_11698;
})();return cljs.core.async.impl.ioc_helpers.run_state_machine_wrapped.call(null,state__6730__auto__);
});})(c__6728__auto__))
);
return c__6728__auto__;
});
cmd.core.unauthorized = (function unauthorized(resp){var error_msg = cmd.utils.raw__GT_clj.call(null,resp);cmd.core.set_state.call(null,cmd.core.state,new cljs.core.Keyword(null,"valid-credentials","valid-credentials",4398423581),false);
cmd.core.set_state.call(null,cmd.core.state,new cljs.core.Keyword(null,"error","error",1110689146),error_msg);
var c__6728__auto___11729 = cljs.core.async.chan.call(null,1);cljs.core.async.impl.dispatch.run.call(null,((function (c__6728__auto___11729,error_msg){
return (function (){var f__6729__auto__ = (function (){var switch__6713__auto__ = ((function (c__6728__auto___11729,error_msg){
return (function (state_11720){var state_val_11721 = (state_11720[1]);if((state_val_11721 === 2))
{var inst_11718 = (state_11720[2]);var state_11720__$1 = state_11720;return cljs.core.async.impl.ioc_helpers.return_chan.call(null,state_11720__$1,inst_11718);
} else
{if((state_val_11721 === 1))
{var inst_11715 = [new cljs.core.Keyword(null,"user-is-authenticated","user-is-authenticated",3919945216),false];var inst_11716 = (new cljs.core.PersistentVector(null,2,5,cljs.core.PersistentVector.EMPTY_NODE,inst_11715,null));var state_11720__$1 = state_11720;return cljs.core.async.impl.ioc_helpers.put_BANG_.call(null,state_11720__$1,2,cmd.core.AppBus,inst_11716);
} else
{return null;
}
}
});})(c__6728__auto___11729,error_msg))
;return ((function (switch__6713__auto__,c__6728__auto___11729,error_msg){
return (function() {
var state_machine__6714__auto__ = null;
var state_machine__6714__auto____0 = (function (){var statearr_11725 = [null,null,null,null,null,null,null];(statearr_11725[0] = state_machine__6714__auto__);
(statearr_11725[1] = 1);
return statearr_11725;
});
var state_machine__6714__auto____1 = (function (state_11720){while(true){
var ret_value__6715__auto__ = (function (){try{while(true){
var result__6716__auto__ = switch__6713__auto__.call(null,state_11720);if(cljs.core.keyword_identical_QMARK_.call(null,result__6716__auto__,new cljs.core.Keyword(null,"recur","recur",1122293407)))
{{
continue;
}
} else
{return result__6716__auto__;
}
break;
}
}catch (e11726){if((e11726 instanceof Object))
{var ex__6717__auto__ = e11726;var statearr_11727_11730 = state_11720;(statearr_11727_11730[5] = ex__6717__auto__);
cljs.core.async.impl.ioc_helpers.process_exception.call(null,state_11720);
return new cljs.core.Keyword(null,"recur","recur",1122293407);
} else
{if(new cljs.core.Keyword(null,"else","else",1017020587))
{throw e11726;
} else
{return null;
}
}
}})();if(cljs.core.keyword_identical_QMARK_.call(null,ret_value__6715__auto__,new cljs.core.Keyword(null,"recur","recur",1122293407)))
{{
var G__11731 = state_11720;
state_11720 = G__11731;
continue;
}
} else
{return ret_value__6715__auto__;
}
break;
}
});
state_machine__6714__auto__ = function(state_11720){
switch(arguments.length){
case 0:
return state_machine__6714__auto____0.call(this);
case 1:
return state_machine__6714__auto____1.call(this,state_11720);
}
throw(new Error('Invalid arity: ' + arguments.length));
};
state_machine__6714__auto__.cljs$core$IFn$_invoke$arity$0 = state_machine__6714__auto____0;
state_machine__6714__auto__.cljs$core$IFn$_invoke$arity$1 = state_machine__6714__auto____1;
return state_machine__6714__auto__;
})()
;})(switch__6713__auto__,c__6728__auto___11729,error_msg))
})();var state__6730__auto__ = (function (){var statearr_11728 = f__6729__auto__.call(null);(statearr_11728[cljs.core.async.impl.ioc_helpers.USER_START_IDX] = c__6728__auto___11729);
return statearr_11728;
})();return cljs.core.async.impl.ioc_helpers.run_state_machine_wrapped.call(null,state__6730__auto__);
});})(c__6728__auto___11729,error_msg))
);
return cmd.core.say.call(null,[cljs.core.str("Looks like you've got an authentication error: "),cljs.core.str(error_msg)].join(''));
});
cmd.core.authenticate = (function authenticate(username,auth_token){var c__6728__auto__ = cljs.core.async.chan.call(null,1);cljs.core.async.impl.dispatch.run.call(null,((function (c__6728__auto__){
return (function (){var f__6729__auto__ = (function (){var switch__6713__auto__ = ((function (c__6728__auto__){
return (function (state_11777){var state_val_11778 = (state_11777[1]);if((state_val_11778 === 5))
{var inst_11769 = (state_11777[7]);var inst_11772 = cmd.core.unauthorized.call(null,inst_11769);var state_11777__$1 = state_11777;var statearr_11779_11792 = state_11777__$1;(statearr_11779_11792[2] = inst_11772);
(statearr_11779_11792[1] = 3);
return new cljs.core.Keyword(null,"recur","recur",1122293407);
} else
{if((state_val_11778 === 4))
{var inst_11770 = cmd.core.logged_in.call(null,username,auth_token);var state_11777__$1 = state_11777;var statearr_11780_11793 = state_11777__$1;(statearr_11780_11793[2] = inst_11770);
(statearr_11780_11793[1] = 3);
return new cljs.core.Keyword(null,"recur","recur",1122293407);
} else
{if((state_val_11778 === 3))
{var inst_11775 = (state_11777[2]);var state_11777__$1 = state_11777;return cljs.core.async.impl.ioc_helpers.return_chan.call(null,state_11777__$1,inst_11775);
} else
{if((state_val_11778 === 2))
{var inst_11767 = (state_11777[2]);var inst_11768 = cljs.core.nth.call(null,inst_11767,0,null);var inst_11769 = cljs.core.nth.call(null,inst_11767,1,null);var state_11777__$1 = (function (){var statearr_11781 = state_11777;(statearr_11781[7] = inst_11769);
return statearr_11781;
})();var G__11782_11794 = inst_11768;if(cljs.core._EQ_.call(null,new cljs.core.Keyword(null,"nothing","nothing",3143228223),G__11782_11794))
{var statearr_11783_11795 = state_11777__$1;(statearr_11783_11795[1] = 5);
} else
{if(cljs.core._EQ_.call(null,new cljs.core.Keyword(null,"just","just",1017178206),G__11782_11794))
{var statearr_11784_11796 = state_11777__$1;(statearr_11784_11796[1] = 4);
} else
{if(new cljs.core.Keyword(null,"else","else",1017020587))
{throw (new Error([cljs.core.str("No matching clause: "),cljs.core.str(inst_11768)].join('')));
} else
{}
}
}
return new cljs.core.Keyword(null,"recur","recur",1122293407);
} else
{if((state_val_11778 === 1))
{var inst_11763 = [cljs.core.str("/users/"),cljs.core.str(username),cljs.core.str("/gists")].join('');var inst_11764 = cmd.core.auth_param_fallback.call(null,username,auth_token);var inst_11765 = cmd.lib.GET.call(null,inst_11763,inst_11764);var state_11777__$1 = state_11777;return cljs.core.async.impl.ioc_helpers.take_BANG_.call(null,state_11777__$1,2,inst_11765);
} else
{return null;
}
}
}
}
}
});})(c__6728__auto__))
;return ((function (switch__6713__auto__,c__6728__auto__){
return (function() {
var state_machine__6714__auto__ = null;
var state_machine__6714__auto____0 = (function (){var statearr_11788 = [null,null,null,null,null,null,null,null];(statearr_11788[0] = state_machine__6714__auto__);
(statearr_11788[1] = 1);
return statearr_11788;
});
var state_machine__6714__auto____1 = (function (state_11777){while(true){
var ret_value__6715__auto__ = (function (){try{while(true){
var result__6716__auto__ = switch__6713__auto__.call(null,state_11777);if(cljs.core.keyword_identical_QMARK_.call(null,result__6716__auto__,new cljs.core.Keyword(null,"recur","recur",1122293407)))
{{
continue;
}
} else
{return result__6716__auto__;
}
break;
}
}catch (e11789){if((e11789 instanceof Object))
{var ex__6717__auto__ = e11789;var statearr_11790_11797 = state_11777;(statearr_11790_11797[5] = ex__6717__auto__);
cljs.core.async.impl.ioc_helpers.process_exception.call(null,state_11777);
return new cljs.core.Keyword(null,"recur","recur",1122293407);
} else
{if(new cljs.core.Keyword(null,"else","else",1017020587))
{throw e11789;
} else
{return null;
}
}
}})();if(cljs.core.keyword_identical_QMARK_.call(null,ret_value__6715__auto__,new cljs.core.Keyword(null,"recur","recur",1122293407)))
{{
var G__11798 = state_11777;
state_11777 = G__11798;
continue;
}
} else
{return ret_value__6715__auto__;
}
break;
}
});
state_machine__6714__auto__ = function(state_11777){
switch(arguments.length){
case 0:
return state_machine__6714__auto____0.call(this);
case 1:
return state_machine__6714__auto____1.call(this,state_11777);
}
throw(new Error('Invalid arity: ' + arguments.length));
};
state_machine__6714__auto__.cljs$core$IFn$_invoke$arity$0 = state_machine__6714__auto____0;
state_machine__6714__auto__.cljs$core$IFn$_invoke$arity$1 = state_machine__6714__auto____1;
return state_machine__6714__auto__;
})()
;})(switch__6713__auto__,c__6728__auto__))
})();var state__6730__auto__ = (function (){var statearr_11791 = f__6729__auto__.call(null);(statearr_11791[cljs.core.async.impl.ioc_helpers.USER_START_IDX] = c__6728__auto__);
return statearr_11791;
})();return cljs.core.async.impl.ioc_helpers.run_state_machine_wrapped.call(null,state__6730__auto__);
});})(c__6728__auto__))
);
return c__6728__auto__;
});
cmd.core.authenticated_om_QMARK_ = (function authenticated_om_QMARK_(state){return state.call(null,new cljs.core.Keyword(null,"valid-credentials","valid-credentials",4398423581));
});
cmd.core.authenticated_QMARK_ = (function authenticated_QMARK_(state){return cmd.core.get_state.call(null,state,new cljs.core.Keyword(null,"valid-credentials","valid-credentials",4398423581));
});
cmd.core.error_set_QMARK_ = (function error_set_QMARK_(state){return state.call(null,new cljs.core.Keyword(null,"error","error",1110689146));
});
cmd.core.parse_location_hash = (function parse_location_hash(){var hash = document.location.hash;if((cljs.core.count.call(null,hash) > 1))
{if((1 === hash.indexOf("!")))
{return cljs.core.zipmap.call(null,new cljs.core.PersistentVector(null, 2, 5, cljs.core.PersistentVector.EMPTY_NODE, [new cljs.core.Keyword(null,"gist-id","gist-id",1053270999),new cljs.core.Keyword(null,"panels","panels",4313328225)], null),cljs.core.subs.call(null,hash,2).split(";"));
} else
{return cljs.core.zipmap.call(null,new cljs.core.PersistentVector(null, 2, 5, cljs.core.PersistentVector.EMPTY_NODE, [new cljs.core.Keyword(null,"gist-id","gist-id",1053270999),new cljs.core.Keyword(null,"panels","panels",4313328225)], null),cljs.core.subs.call(null,hash,1).split(";"));
}
} else
{return cljs.core.PersistentArrayMap.EMPTY;
}
});
cmd.core.get_gist_id_from_location_hash = (function get_gist_id_from_location_hash(){var x = cmd.core.parse_location_hash.call(null).call(null,new cljs.core.Keyword(null,"gist-id","gist-id",1053270999));if(cljs.core._EQ_.call(null,x,""))
{return null;
} else
{return x;
}
});
cmd.core.get_panels_from_location_hash = (function get_panels_from_location_hash(){var x = cmd.core.parse_location_hash.call(null).call(null,new cljs.core.Keyword(null,"panels","panels",4313328225));return x;
});
cmd.core.set_title = (function set_title(title){return document.title = [cljs.core.str(title),cljs.core.str(" : "),cljs.core.str(cmd.defs.default_title)].join('');
});
cmd.core.set_location_hash = (function set_location_hash(hash_hash){var gist_id = (function (){var or__3481__auto__ = hash_hash.call(null,new cljs.core.Keyword(null,"gist-id","gist-id",1053270999));if(cljs.core.truth_(or__3481__auto__))
{return or__3481__auto__;
} else
{return "";
}
})();var panels = hash_hash.call(null,new cljs.core.Keyword(null,"panels","panels",4313328225));var chunks = (((panels == null))?new cljs.core.PersistentVector(null, 1, 5, cljs.core.PersistentVector.EMPTY_NODE, [gist_id], null):new cljs.core.PersistentVector(null, 2, 5, cljs.core.PersistentVector.EMPTY_NODE, [gist_id,panels], null));return document.location.hash = [cljs.core.str("!"),cljs.core.str(clojure.string.join.call(null,";",chunks))].join('');
});
cmd.core.set_location_hash_gist_id = (function set_location_hash_gist_id(gist_id){var lh = cmd.core.parse_location_hash.call(null);var new_lh = cljs.core.assoc.call(null,lh,new cljs.core.Keyword(null,"gist-id","gist-id",1053270999),gist_id);return cmd.core.set_location_hash.call(null,new_lh);
});
cmd.core.set_location_hash_panels = (function set_location_hash_panels(panels){var lh = cmd.core.parse_location_hash.call(null);var new_lh = cljs.core.assoc.call(null,lh,new cljs.core.Keyword(null,"panels","panels",4313328225),clojure.string.join.call(null,panels));return cmd.core.set_location_hash.call(null,new_lh);
});
cmd.core.load_initial_content = (function load_initial_content(){var gist_id = cmd.core.get_gist_id_from_location_hash.call(null);if((gist_id == null))
{return cmd.core.get_motd.call(null,cmd.defs.default_motd_id);
} else
{return cmd.core.load_gist.call(null,gist_id);
}
});
cmd.core.ace_set_value = (function ace_set_value(content){return cmd.core.get_state.call(null,cmd.core.state,new cljs.core.Keyword(null,"ace","ace",1014000629)).getSession().setValue(content);
});
cmd.core.set_input = (function set_input(gist_id){var gist = cmd.core.get_state.call(null,cmd.core.state,new cljs.core.Keyword(null,"current-gist","current-gist",2436253193));var vec__11800 = cljs.core.first.call(null,gist.call(null,"files"));var _ = cljs.core.nth.call(null,vec__11800,0,null);var first_file = cljs.core.nth.call(null,vec__11800,1,null);var content = first_file.call(null,"content");return cmd.core.ace_set_value.call(null,content);
});
cmd.core.reset_input_with_motd = (function reset_input_with_motd(){return cmd.core.ace_set_value.call(null,cmd.core.get_state.call(null,cmd.core.state,new cljs.core.Keyword(null,"motd","motd",1017261828)));
});
cmd.core.get_pinned_gists = (function get_pinned_gists(state){return cljs.core.filter.call(null,(function (gist){return cljs.core.contains_QMARK_.call(null,new cljs.core.Keyword(null,"pinned-gists","pinned-gists",1364707149).cljs$core$IFn$_invoke$arity$1(state),gist.call(null,"id"));
}),new cljs.core.Keyword(null,"gists","gists",1112269186).cljs$core$IFn$_invoke$arity$1(state));
});

//# sourceMappingURL=core.js.map