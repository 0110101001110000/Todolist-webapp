

/* Init -------------------------------------------------------------------- */


// Requires
require("dotenv").config();
const express = require("express");
const _ = require("lodash");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const date = require(__dirname + "/date.js");

// Setup
const app = express();
app.use(bodyParser.urlencoded({"extended" : true}));
app.use(express.static("public"));
app.set("view engine", "ejs");


/* Global vars/lets/consts/functs ------------------------------------------ */


// Lets 
let currentDay = date.getDate();

// Functs 
function repl(word = String, letterToReplace = String, toReplaceBy = String) {
    let replaced = "";
    for (let i = 0; i < word.length; i++) {
        const element = word[i];
        if (element === letterToReplace) {
            replaced += toReplaceBy;
        } else {
            replaced += element;
        }
    };
    return replaced;
}

function urlTrate(url = String) {
    const lower = _.lowerCase(url);
    const replaced = repl(lower, " ", "-");
    const splited = _.split(replaced, "-");
    const lastPart = splited[splited.length - 1];
    if (lastPart[0] === "-") {
        return replaced.slice(0, (replaced.length - lastPart.length));
    } else {
        return replaced;
    }
}


/* Mongoose ---------------------------------------------------------------- */


// Connection 
const cluster = process.env.CLUSTER;
const clusterPassword = process.env.CLUSTER_PASSWORD;
const uri = "mongodb+srv://" + cluster + ":" + clusterPassword + "@website-databases.55tvsmc.mongodb.net/todolistDB";
mongoose.set('strictQuery', false);
mongoose.connect(uri);

// Item Schema 
const itemSchema = {
    name: String
}

// Mongoose model 
const Item = mongoose.model("Item", itemSchema);

// Defalt items 
const item1 = new Item({
    name: "Welcome to your todolist!"
});

const item2 = new Item({
    name: "Hit the + button to add a new item."    
});

const item3 = new Item({
    name: "<-- Hit this to delete an item."
});

// Insert defalt items 
const defaltItems = [item1, item2, item3];

// list Schema 
const listSchema = {
    name: String,
    items: [itemSchema]
}

const List = mongoose.model("List", listSchema);


/* Home rout --------------------------------------------------------------- */


app.get("/", function(req, res) {

    // Defalt list
    Item.find({}, (err, foundItems) => {
        
        if (err) { 
            console.log(err); 
        } else {
            if (foundItems.length >= 1) {
                // Render page
                res.render("list", {listHeading: currentDay, isDefaltList: true, listItems: foundItems});
            } else {
                // Insert the defalt items 
                Item.insertMany(defaltItems, (err) => {
                    if (err) { console.log(err) }
                });

                // Refresh page 
                res.redirect("/");
            }
        }
    });
});


app.post("/", function(req, res) {
    // Get the formulary 
    const itemName = req.body.newItem;
    const listName = req.body.list;
    const listNameTrated = urlTrate(listName);
    
    // Save item on Home rout 
    if (listName === "/") {
        if (itemName === "") {
            // Refresh code 
            res.redirect("/");
        } else {
            // Item 
            const item = new Item({
                name: itemName
            });

            item.save();
            
            // Refresh code 
            res.redirect("/");
        }
    } else {
        // Save item on custom rout 
        if (itemName === "") {
            // Refresh code 
            res.redirect("/" + listNameTrated);
        } else {
            List.findOne({name: listNameTrated}, (err, foundItem) => {
                if (err) {
                    console.log(err);    
                } else {
                    // Item 
                    const item = new Item({
                        name: itemName
                    });

                    foundItem.items.push(item);

                    foundItem.save();
            
                    // Refresh code 
                    res.redirect("/" + listNameTrated);
                }
            });
        }
    }
});


app.post("/delet", function(req, res) {
    const listName = req.body.listName;
    const checkedItemId = req.body.itemId;
    const checkedItemlistName = urlTrate(listName);

    if (listName == "/") {
        Item.findByIdAndRemove(checkedItemId, (err) => {
            if (err) {
                console.log(err);
            } else {
                res.redirect("/");
            }
        });
    } else {
        List.findOneAndUpdate({name: checkedItemlistName}, {$pull: {items: {_id: checkedItemId}}}, (err, foundItem) => { 
            if (err) {
                console.log(err);
            } else {
                res.redirect("/" + checkedItemlistName);
            }        
        });
    }
});


/* Others routs ------------------------------------------------------------ */


app.get("/:customListName", (req, res) => {
    const customListName = req.params.customListName;
    const customListNameTrated = urlTrate(customListName);
    const heading = _.capitalize(customListName);
    const headingTrated = repl(heading, "-", " ");

    // Add the custom list name on db 
    List.findOne({name: customListNameTrated}, (err, result) => {
        if (err) { 
            console.log(err);
        } else {
            if (result) {
                if (result.items.length === 0) {
                    List.findByIdAndUpdate(result._id, {$set: {items: defaltItems}}, (err) => {
                        if (err) {
                            console.log(err);
                        } else {
                            // Refresh code 
                            res.redirect("/" + customListNameTrated);                        
                        }
                    });                    
                } else {
                    res.render("list", {listHeading: headingTrated, isDefaltList: false, listItems: result.items});
                }
            } else {
                const list = new List({
                    name: customListNameTrated,
                    items: defaltItems
                });
            
                list.save();

                // Refresh code 
                res.redirect("/" + customListNameTrated);
            }
        }
    });
});


/* About rout -------------------------------------------------------------- */


// Sending the about rout to the browser 
app.get("/about", function(req, res) {
    res.render("about");
});


/* Port -------------------------------------------------------------------- */


app.listen(3000, function() {
    console.log("Server is running on port 3000!");
});
