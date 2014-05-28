
function pidjs(ts, kc, ti, td){
    this.ek_1 = 0.0;  // e[k-1] = SP[k-1] - PV[k-1] = Tset_hlt[k-1] - Thlt[k-1]
    this.ek_2 = 0.0;  // e[k-2] = SP[k-2] - PV[k-2] = Tset_hlt[k-2] - Thlt[k-2]
    this.xk_1 = 0.0;  // PV[k-1] = Thlt[k-1]
    this.xk_2 = 0.0;  // PV[k-2] = Thlt[k-1]
    this.yk_1 = 0.0;  // y[k-1] = Gamma[k-1]
    this.yk_2 = 0.0;  // y[k-2] = Gamma[k-1]
    this.lpf_1 = 0.0; // lpf[k-1] = LPF output[k-1]
    this.lpf_2 = 0.0; // lpf[k-2] = LPF output[k-2]
    
    this.yk = 0.0; // output
    
    this.GMA_HLIM = 100.0;
    this.GMA_LLIM = 0.0;
    
    this.kc = kc;
    this.ti = ti;
    this.td = td;
    this.ts = ts;
    this.k_lpf = 0.0;
    this.k0 = 0.0;
    this.k1 = 0.0;
    this.k2 = 0.0;
    this.k3 = 0.0;
    this.lpf1 = 0.0;
    this.lpf2 = 0.0;
    this.ts_ticks = 0;
    this.pid_model = 3;
    this.pp = 0.0;
    this.pi = 0.0;
    this.pd = 0.0;
    if (this.ti == 0.0){
        this.k0 = 0.0;
    } else {
        this.k0 = this.kc * this.ts / this.ti;
    }
    this.k1 = this.kc * this.td / this.ts;
    this.lpf1 = (2.0 * this.k_lpf - this.ts) / (2.0 * this.k_lpf + this.ts);
    this.lpf2 = this.ts / (2.0 * this.k_lpf + this.ts);
}
        
pidjs.prototype.calcPID_reg3 = function(xk, tset, enable){
    ek = 0.0;
    lpf = 0.0;
    ek = tset - xk; // calculate e[k] = SP[k] - PV[k]
    //--------------------------------------
    // Calculate Lowpass Filter for D-term
    //--------------------------------------
    lpf = this.lpf1 * this.lpf_1 + this.lpf2 * (ek + this.ek_1);
    
    if (enable){
        //-----------------------------------------------------------
        // Calculate PID controller:
        // y[k] = y[k-1] + kc*(e[k] - e[k-1] +
        // Ts*e[k]/Ti +
        // Td/Ts*(lpf[k] - 2*lpf[k-1] + lpf[k-2]))
        //-----------------------------------------------------------
        this.pp = this.kc * (ek - this.ek_1); // y[k] = y[k-1] + Kc*(PV[k-1] - PV[k])
        this.pi = this.k0 * ek;  // + Kc*Ts/Ti * e[k]
        this.pd = this.k1 * (lpf - 2.0 * this.lpf_1 + this.lpf_2);
        this.yk += this.pp + this.pi + this.pd;
    } else {
        this.yk = 0.0;
        this.pp = 0.0;
        this.pi = 0.0;
        this.pd = 0.0;
    }
    this.ek_1 = this.ek; // e[k-1] = e[k]
    this.lpf_2 = this.lpf_1; // update stores for LPF
    this.lpf_1 = this.lpf;
        
    // limit y[k] to GMA_HLIM and GMA_LLIM
    if (this.yk > this.GMA_HLIM){
        this.yk = this.GMA_HLIM;
    }
    if (this.yk < this.GMA_LLIM){
        this.yk = this.GMA_LLIM;
    }
    return this.yk;
};
                          
pidjs.prototype.calcPID_reg4 = function(xk, tset, enable){
    ek = 0.0;
    ek = tset - xk; // calculate e[k] = SP[k] - PV[k]
    
    if (enable){
        //-----------------------------------------------------------
        // Calculate PID controller:
        // y[k] = y[k-1] + kc*(PV[k-1] - PV[k] +
        // Ts*e[k]/Ti +
        // Td/Ts*(2*PV[k-1] - PV[k] - PV[k-2]))
        //-----------------------------------------------------------
        this.pp = this.kc * (this.xk_1 - xk); // y[k] = y[k-1] + Kc*(PV[k-1] - PV[k])
        this.pi = this.k0 * ek;  // + Kc*Ts/Ti * e[k]
        this.pd = this.k1 * (2.0 * this.xk_1 - xk - this.xk_2);
        this.yk += this.pp + this.pi + this.pd;
    } else {
        this.yk = 0.0;
        this.pp = 0.0;
        this.pi = 0.0;
        this.pd = 0.0;
    }
    this.xk_2 = this.xk_1;  // PV[k-2] = PV[k-1]
    this.xk_1 = xk;    // PV[k-1] = PV[k]
    
    // limit y[k] to GMA_HLIM and GMA_LLIM
    if (this.yk > this.GMA_HLIM){
        this.yk = this.GMA_HLIM;
    }
    if (this.yk < this.GMA_LLIM){
        this.yk = this.GMA_LLIM;
    }
        
    return this.yk;
};

