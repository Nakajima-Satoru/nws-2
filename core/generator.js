const fs = require("fs");
const routing = require("./routing.js");
const sync = require("./sync.js");
const text = require("./text.js");

module.exports={
    
    go:function(ro){

        var getRoute = routing.get(ro.request, ro.project.config.routing);

        if(!getRoute){
            ro.status(404);
            throw new Error("Access Page not found.");
        }

        ro.route=getRoute;

        var controllerFullName=text.ucfirst(ro.route.controller)+"Controller";

        var controllerPath=ro.project.path+"/app/Controller/"+controllerFullName+".js";

        if(!fs.existsSync(controllerPath)){
            ro.status(500);
            throw new Error("\""+controllerFullName+"\" file not Found.");
        }

        var _c = require(controllerPath);

        var cont=new _c(ro);

        if(!cont[ro.route.action]){
            ro.status(500);
            throw new Error("The \""+ro.route.action+"\" method of \""+controllerFullName+"\" is not specified.");
        }

        cont.wait=function(){
            this._waited=true;
        };
        cont.next=function(){
            this._waited=false;
            this._next();
        };

        sync([
            function(next){
                cont._next=next;
                next();        
            },
            function(next){

                // call handlebefore
                if(!cont.handleBefore){
                    next();
                    return;
                }

                cont.handleBefore();
                if(!cont._waited){
                    next();
                }
            },
            function(next){

                if(ro.route.aregment){
                    cont[ro.route.action](...ro.route.aregment);
                }
                else{
                    cont[ro.route.action]();
                }

                if(!cont._waited){
                    next();
                }
            },
            function(next){

                // call handleAfter
                if(!cont.handleAfter){
                    next();
                    return;
                }

                cont.handleAfter();
                if(!cont._waited){
                    next();
                }
            },
            function(next){

                // rendering
                cont._rendering();
                next();

            },
            function(next){
                ro.exit();
            },
       ]);

    },

    error:function(ro,error){
        if(ro.project.config.debugMode){
            ro.exit("<pre>"+error.stack+"</pre>");
        }
        else{
            ro.exit("<pre>Invalid Error.</pre>");
        }
    },

    
};