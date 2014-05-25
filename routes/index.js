var express = require('express');
var router = express.Router();

var gpio = require('rpi-gpio');
gpio.setup(25, true);

/* GET home page. */
router.get('/', function(req, res) {
  res.render('index', { title: 'Express' });
});

/* GET Hello World page. */
router.get('/helloworld', function(req, res) {
    res.render('helloworld', { title: 'Hello, World!' })
});

router.get('/relay_change', function (req, res) {
    var state = req.query.state != 0;
    gpio.write(25, true, function(err) {
        if (err) {
            res.json({failed:true, wrote:-1});
        } else {
            res.json({failed:false, wrote:state});
        }
    })
});


router.get('/relay_off', function (req, res) {
    res.json({wrote:1})
});

module.exports = router;
