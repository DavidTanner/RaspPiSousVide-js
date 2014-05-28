/**********************************************************************************************
 * Arduino PID Library - Version 1.0.1
 * by Brett Beauregard <br3ttb@gmail.com> brettbeauregard.com
 *
 * This Library is licensed under a GPLv3 License
 **********************************************************************************************/

/**
 *
 * Variables
 *
 */

var dispKp;				// * we'll hold on to the tuning parameters in user-entered
var dispKi;				//   format for display purposes
var dispKd;				//

var kp;                  // * (P)roportional Tuning Parameter
var ki;                  // * (I)ntegral Tuning Parameter
var kd;                  // * (D)erivative Tuning Parameter

var controllerDirection;

var myInput;              // * Pointers to the Input, Output, and Setpoint variables
var myOutput;             //   This creates a hard link between the variables and the
var mySetpoint;           //   PID, freeing the user from having to constantly tell us
//   what these values are.  with pointers we'll just know.

var lastTime;
var ITerm;
var lastInput;

var SampleTime;
var outMin;
var outMax;
var inAuto;

var AUTOMATIC = 1;
var MANUAL    = 0;
var DIRECT    = 0;
var REVERSE   = 1;

    /*Constructor (...)*********************************************************
     *    The parameters specified here are those for for which we can't set up
     *    reliable defaults, so we need to have the user set them.
     ***************************************************************************/
exports.PID = function PID(Input, Output, Setpoint, Kp, Ki, Kd, ControllerDirection)
{

    myOutput = Output;
    myInput = Input;
    mySetpoint = Setpoint;
    inAuto = false;

    this.SetOutputLimits(0, 100);				//default output limit corresponds to
    //the arduino pwm limits

    SampleTime = 2000;							//default Controller Sample Time is 0.1 seconds

    this.SetControllerDirection(ControllerDirection);
    this.SetTunings(Kp, Ki, Kd);

    lastTime = new Date().getTime()-SampleTime;
};


/* Compute() **********************************************************************
 *     This, as they say, is where the magic happens.  this function should be called
 *   every time "void loop()" executes.  the function will decide for itself whether a new
 *   pid Output needs to be computed.  returns true when the output is computed,
 *   false when nothing has been done.
 **********************************************************************************/
exports.Compute = function Compute()
{
    if(!inAuto) return false;
    var now = new Date().getTime();
    var timeChange = (now - lastTime);
    if(timeChange>=SampleTime)
    {
        /*Compute all the working error variables*/
        var input = myInput;
        var error = mySetpoint - input;
        ITerm+= (ki * error);
        if(ITerm > outMax) ITerm= outMax;
        else if(ITerm < outMin) ITerm= outMin;
        var dInput = (input - lastInput);

        /*Compute PID Output*/
        var output = kp * error + ITerm- kd * dInput;

        if(output > outMax) output = outMax;
        else if(output < outMin) output = outMin;
        myOutput = output;

        /*Remember some variables for next time*/
        lastInput = input;
        lastTime = now;
        return true;
    }
    else return false;
};


/* SetTunings(...)*************************************************************
 * This function allows the controller's dynamic performance to be adjusted. 
 * it's called automatically from the constructor, but tunings can also
 * be adjusted on the fly during normal operation
 ******************************************************************************/
exports.SetTunings = function SetTunings(Kp, Ki, Kd)
{
    if (Kp<0 || Ki<0 || Kd<0) return;

    dispKp = Kp; dispKi = Ki; dispKd = Kd;

    var SampleTimeInSec = (SampleTime)/1000;
    kp = Kp;
    ki = Ki * SampleTimeInSec;
    kd = Kd / SampleTimeInSec;

    if(controllerDirection == REVERSE)
    {
        kp = (0 - kp);
        ki = (0 - ki);
        kd = (0 - kd);
    }
};

/* SetSampleTime(...) *********************************************************
 * sets the period, in Milliseconds, at which the calculation is performed	
 ******************************************************************************/
exports.SetSampleTime = function SetSampleTime(NewSampleTime)
{
    if (NewSampleTime > 0)
    {
        var ratio  = NewSampleTime / SampleTime;
        ki *= ratio;
        kd /= ratio;
        SampleTime = NewSampleTime;
    }
};

/* SetOutputLimits(...)****************************************************
 *     This function will be used far more often than SetInputLimits.  while
 *  the input to the controller will generally be in the 0-1023 range (which is
 *  the default already,)  the output will be a little different.  maybe they'll
 *  be doing a time window and will need 0-8000 or something.  or maybe they'll
 *  want to clamp it from 0-125.  who knows.  at any rate, that can all be done
 *  here.
 **************************************************************************/
exports.SetOutputLimits = function SetOutputLimits(Min, Max)
{
    if(Min >= Max) return;
    outMin = Min;
    outMax = Max;

    if(inAuto)
    {
        if(myOutput > outMax) {
            myOutput = outMax;
        } else if(myOutput < outMin){
            myOutput = outMin;
        }

        if(ITerm > outMax) {
            ITerm = outMax;
        } else if(ITerm < outMin) {
            ITerm = outMin;
        }
    }
};

/* SetMode(...)****************************************************************
 * Allows the controller Mode to be set to manual (0) or Automatic (non-zero)
 * when the transition from manual to auto occurs, the controller is
 * automatically initialized
 ******************************************************************************/
exports.SetMode = function SetMode(Mode)
{
    var newAuto = (Mode == AUTOMATIC);
    if(newAuto == !inAuto)
    {  /*we just went from manual to auto*/
        this.Initialize();
    }
    inAuto = newAuto;
};

/* Initialize()****************************************************************
 *	does all the things that need to happen to ensure a bumpless transfer
 *  from manual to automatic mode.
 ******************************************************************************/
exports.Initialize = function Initialize()
{
    ITerm = myOutput;
    lastInput = myInput;
    if(ITerm > outMax) ITerm = outMax;
    else if(ITerm < outMin) ITerm = outMin;
};

/* SetControllerDirection(...)*************************************************
 * The PID will either be connected to a DIRECT acting process (+Output leads 
 * to +Input) or a REVERSE acting process(+Output leads to -Input.)  we need to
 * know which one, because otherwise we may increase the output when we should
 * be decreasing.  This is called from the constructor.
 ******************************************************************************/
exports.SetControllerDirection = function SetControllerDirection(Direction)
{
    var dir = Direction == REVERSE ? REVERSE : DIRECT;
    if(inAuto && dir !=controllerDirection)
    {
        kp = (0 - kp);
        ki = (0 - ki);
        kd = (0 - kd);
    }
    controllerDirection = dir;
};

/* Status Funcions*************************************************************
 * Just because you set the Kp=-1 doesn't mean it actually happened.  these
 * functions query the internal state of the PID.  they're here for display 
 * purposes.  this are the functions the PID Front-end uses for example
 ******************************************************************************/
exports.GetKp = function GetKp(){ return  dispKp;};
exports.GetKi = function GetKi(){ return  dispKi;};
exports.GetKd = function GetKd(){ return  dispKd;};
exports.GetMode = function GetMode(){ return  inAuto ? AUTOMATIC : MANUAL;};
exports.GetDirection = function GetDirection(){ return controllerDirection;};
